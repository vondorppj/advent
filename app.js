(() => {
  const C = CALENDRIER;
  const NB = 24;
  const params = new URLSearchParams(location.search);
  const APERCU = C.apercu === true || params.has('apercu'); // tout est déverrouillé (pour tester)
  const CLE = 'avent-' + C.annee + (APERCU ? '-apercu' : '');
  if (params.has('reset')) { try { localStorage.removeItem(CLE); } catch (e) {} }

  const $ = (id) => document.getElementById(id);
  const grille = $('grille'), scene = $('scene'), inner = $('scene-inner'),
        consigne = $('consigne'), toastEl = $('toast');

  const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)) || []; } catch (e) { return []; } };
  const ouverts = new Set(lire());
  const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify([...ouverts])); } catch (e) {} };

  const MOIS = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(C.annee, C.mois - 1, 1));

  const ic = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const TYPES = {
    photo:  { nom: 'Memory',         icone: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>') },
    voucher:{ nom: 'Voucher',         icone: ic('<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2z"/><path d="M14 6v12" stroke-dasharray="1.5 2"/>') },
    note:   { nom: 'Love note',         icone: ic('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>') },
    gift:   { nom: 'Treasure hunt', icone: ic('<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M2.5 9h19M12 9v11"/><path d="M12 9c-1.5-3-5-4-5-1.5S10 9 12 9zm0 0c1.5-3 5-4 5-1.5S14 9 12 9z"/>') }
  };

  const jour = (j) => C.jours[j] || { type: 'note', titre: '…', texte: '' };
  const type = (d) => TYPES[d.type] || TYPES.note;
  const estDispo = (j) => APERCU || new Date() >= new Date(C.annee, C.mois - 1, j);

  /* ---------- Grille ---------- */
  function rendreGrille() {
    grille.innerHTML = '';
    for (let j = 1; j <= NB; j++) {
      const d = jour(j);
      const etat = ouverts.has(j) ? 'ouverte' : estDispo(j) ? 'dispo' : 'verrou';
      const b = document.createElement('button');
      b.className = `case ${etat} t-${d.type}`;
      b.style.animationDelay = (j * 18) + 'ms';
      if (etat === 'ouverte' && d.image) { b.classList.add('a-photo'); b.style.backgroundImage = `url("${d.image}")`; }
      b.innerHTML = `<span class="num">${j}</span>` +
        (etat === 'ouverte' ? (d.image ? '' : `<span class="mini">${type(d).icone}</span>`) :
         etat === 'dispo' ? '<span class="point"></span>' : '');
      b.setAttribute('aria-label', `${MOIS} ${j}` + (etat === 'verrou' ? ' (not yet)' : ''));
      b.onclick = () => etat === 'verrou' ? toast(`Patience… this one opens on ${MOIS} ${j}.`)
                  : etat === 'dispo' ? ouvrirPack(j) : montrerCarte(j);
      grille.append(b);
    }
    $('titre').textContent = C.titre;
    $('sous-titre').textContent = C.sousTitre;
    $('compteur').textContent = `${ouverts.size} / ${NB} cards`;
    $('pied').innerHTML = APERCU
      ? `Preview mode · everything is unlocked · <a href="#" id="reinit">reset</a>`
      : `One card a day, until ${MOIS} 24.`;
    const r = $('reinit');
    if (r) r.onclick = (e) => { e.preventDefault(); ouverts.clear(); sauver(); rendreGrille(); };
  }

  /* ---------- Carte ---------- */
  function carteHTML(j, d) {
    const t = type(d);
    const art = d.image
      ? `<img src="${d.image}" alt="" onerror="this.parentNode.classList.add('vide');this.remove()"><span class="art-ic">${t.icone}</span>`
      : `<span class="art-ic">${t.icone}</span>`;
    const texte = (d.texte || '').replace(/\n/g, '<br>');
    return `
      <div class="carte t-${d.type} ${d.rare ? 'rare' : ''}">
        <div class="carte-inner">
          <div class="face dos"><div class="dos-motif"></div><div class="dos-coeur">♥</div><p class="dos-txt">Advent ${C.annee}</p></div>
          <div class="face avant ${d.image ? 'full-photo' : 'full-noir'}">
            <div class="carte-art ${d.image ? 'a-photo' : ''}">${art}</div>
            <div class="voile"></div>
            <div class="carte-tete"><span class="carte-type">${t.nom}</span><span class="carte-num">${String(j).padStart(2, '0')}<i>/${NB}</i></span></div>
            <div class="carte-bas">
              ${d.titre ? `<h2 class="carte-titre">${d.titre}</h2>` : ''}
              ${texte ? `<p class="carte-texte">${texte}</p>` : ''}
              <div class="carte-pied"><span>${d.rare ? '★ Rare card' : '♥'}</span><span>${MOIS} ${j}</span></div>
            </div>
            <div class="holo"></div>
          </div>
        </div>
      </div>`;
  }

  function activerInclinaison(carte) {
    const bouger = (e) => {
      const r = carte.getBoundingClientRect();
      const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
      carte.style.setProperty('--ry', ((x - .5) * 18) + 'deg');
      carte.style.setProperty('--rx', ((.5 - y) * 18) + 'deg');
      carte.style.setProperty('--mx', (x * 100) + '%');
      carte.style.setProperty('--my', (y * 100) + '%');
      carte.style.setProperty('--hx', (x * 100) + '%');
      carte.style.setProperty('--hy', (y * 100) + '%');
      carte.classList.add('actif');
    };
    const reset = () => { ['--rx', '--ry'].forEach(p => carte.style.setProperty(p, '0deg')); carte.classList.remove('actif'); };
    carte.addEventListener('pointermove', bouger);
    carte.addEventListener('pointerleave', reset);
    carte.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') setTimeout(reset, 900); });
  }

  /* ---------- Pack ---------- */
  function ouvrirPack(j) {
    const d = jour(j);
    inner.innerHTML = `
      <div class="pack" id="pack">
        <div class="pack-haut"><span class="crimp"></span></div>
        <div class="pack-corps">
          <div class="pack-brillance"></div>
          <p class="pack-sur">${C.sousTitre}</p>
          <p class="pack-jour">${j}</p>
          <p class="pack-mois">${MOIS}</p>
          <span class="crimp bas"></span>
        </div>
        <div class="dechirure"><span></span></div>
      </div>
      <div class="carte-wrap" id="cw">${carteHTML(j, d)}</div>`;
    consigne.textContent = 'Swipe along the dotted line to open';
    afficherScene();

    const pack = $('pack');
    let x0 = null, fait = false;
    const dechirer = () => {
      if (fait) return; fait = true;
      pack.classList.add('ouvert');
      consigne.textContent = '';
      vibrer(20);
      setTimeout(() => $('cw').classList.add('sort'), 380);
      setTimeout(() => {
        $('cw').classList.add('retournee');
        vibrer([10, 40, 10]);
        ouverts.add(j); sauver(); rendreGrille();
      }, 1150);
      setTimeout(() => { pack.remove(); consigne.textContent = ''; }, 1800);
    };
    pack.addEventListener('pointerdown', (e) => { x0 = e.clientX; pack.setPointerCapture(e.pointerId); });
    pack.addEventListener('pointermove', (e) => {
      if (x0 === null || fait) return;
      const p = Math.min(Math.max((e.clientX - x0) / pack.offsetWidth, 0), 1);
      pack.style.setProperty('--p', p);
      if (p > .55) dechirer();
    });
    pack.addEventListener('pointerup', (e) => {
      if (x0 !== null && Math.abs(e.clientX - x0) < 6) dechirer(); // un simple tap marche aussi
      x0 = null;
      if (!fait) pack.style.setProperty('--p', 0);
    });
    activerInclinaison(inner.querySelector('.carte'));
  }

  function montrerCarte(j) {
    inner.innerHTML = `<div class="carte-wrap sort retournee deja">${carteHTML(j, jour(j))}</div>`;
    consigne.textContent = '';
    afficherScene();
    activerInclinaison(inner.querySelector('.carte'));
  }

  /* ---------- Scène / utilitaires ---------- */
  function afficherScene() { scene.hidden = false; document.body.style.overflow = 'hidden'; }
  function fermerScene() { scene.hidden = true; inner.innerHTML = ''; document.body.style.overflow = ''; }
  $('fermer').onclick = fermerScene;
  scene.addEventListener('click', (e) => { if (e.target === scene) fermerScene(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !scene.hidden) fermerScene(); });

  let tt;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 2200);
  }
  function vibrer(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

  /* ---------- Mot de passe + déchiffrement ---------- */
  const CLE_MDP = 'avent-mdp-' + C.annee;
  const norm = (s) => s.trim().toLowerCase();
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  let paquet = null;

  async function dechiffrer(mdp) {
    if (!paquet) paquet = await (await fetch('data.json', { cache: 'no-store' })).json();
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(norm(mdp)), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(paquet.salt), iterations: paquet.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(paquet.iv) }, key, b64(paquet.ct));
    return JSON.parse(new TextDecoder().decode(clair));
  }

  function demarrer(data) {
    C.jours = data.jours;
    rendreGrille();
    const v = $('verrou');
    v.classList.add('ouvre');
    setTimeout(() => { document.body.classList.remove('verrouille'); v.remove(); }, 900);
    // Si on reste ouvert après minuit, la nouvelle case se débloque toute seule
    setInterval(() => { if (scene.hidden) rendreGrille(); }, 60000);
  }

  const form = $('form-mdp'), champ = $('mdp'), msg = $('mdp-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!champ.value.trim()) { champ.focus(); return; }
    form.classList.add('attente'); msg.textContent = '';
    try {
      const data = await dechiffrer(champ.value);
      try { localStorage.setItem(CLE_MDP, norm(champ.value)); } catch (err) {}
      champ.blur(); vibrer([10, 40, 10]);
      demarrer(data);
    } catch (err) {
      form.classList.remove('attente');
      form.classList.remove('secoue'); void form.offsetWidth; form.classList.add('secoue');
      msg.textContent = paquet ? 'Not quite… try again ♥' : 'Could not load the calendar.';
      vibrer(60); champ.select();
    }
  });

  (async () => {
    let memo = null;
    try { memo = localStorage.getItem(CLE_MDP); } catch (e) {}
    if (memo) {
      try { const data = await dechiffrer(memo); $('verrou').classList.add('instant'); demarrer(data); return; }
      catch (e) { try { localStorage.removeItem(CLE_MDP); } catch (err) {} }
    }
    $('verrou').classList.add('pret');
  })();
})();
