/* COSMIC SPACE CIVILIZATION â€” educational simulation only */
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const state = {
    power:false, oxygenGen:false, oxygenCirculation:false, hydro:false, hydroLights:false, hydroPump:false,
    waterPurification:false, waterRecycling:false, heating:false, cooling:false, air:false,
    oxygen:98, water:82, battery:86, air:96, temp:22, co2:0.08, hydroHealth:100,
    setpoint:22, elapsed:0, sound:false, startup:false
  };
  const initial = {...state};
  let toastTimer, clockTimer, tickTimer, audioCtx;

  // Starfield canvas â€” lightweight 2D background.
  const canvas = $('#starfield'), ctx = canvas.getContext('2d');
  let stars = [];
  function resizeStars(){
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = innerWidth*dpr; canvas.height = innerHeight*dpr;
    canvas.style.width = innerWidth+'px'; canvas.style.height = innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    stars = Array.from({length:Math.min(170,Math.floor(innerWidth/5))},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.2+.2,a:Math.random()*.7+.15,s:Math.random()*.22+.04}));
  }
  function drawStars(){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    stars.forEach(st=>{st.y+=st.s;if(st.y>innerHeight){st.y=0;st.x=Math.random()*innerWidth}ctx.globalAlpha=st.a*(.7+.3*Math.sin(Date.now()*.001+st.x));ctx.fillStyle='#b8e6ff';ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fill()});
    ctx.globalAlpha=1;requestAnimationFrame(drawStars);
  }
  resizeStars();drawStars();window.addEventListener('resize',resizeStars);

  // Opening loader.
  let load=0;const loaderBar=$('#loaderBar'),loaderText=$('#loaderText');
  const loaderInterval=setInterval(()=>{load=Math.min(100,load+Math.ceil(Math.random()*13));loaderBar.style.width=load+'%';loaderText.textContent=`CALIBRATING NAVIGATION Â· ${String(load).padStart(2,'0')}%`;if(load>=100){clearInterval(loaderInterval);setTimeout(()=>$('#loader').classList.add('done'),350)}},130);

  // Icons, menu and scroll reveals.
  if(window.lucide) lucide.createIcons();
  $('#menuToggle').addEventListener('click',()=>$('#mainNav').classList.toggle('open'));
  $$('.nav-link').forEach(a=>a.addEventListener('click',()=>$('#mainNav').classList.remove('open')));
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObserver.unobserve(e.target)}}),{threshold:.12});
  $$('.reveal').forEach(el=>revealObserver.observe(el));
  const navObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){$$('.nav-link').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))}}),{rootMargin:'-35% 0px -55% 0px'});
  ['home','spacecraft','life-support','systems','interior','cosmic-core'].forEach(id=>{const el=document.getElementById(id);if(el)navObserver.observe(el)});
  $('#enterMission').addEventListener('click',()=>{document.querySelector('#cosmic-core').scrollIntoView({behavior:'smooth'});toast('MISSION CONTROL LINK ESTABLISHED');beep(660,.08)});

  // Optional synthesized interface tones; no external audio files.
  function beep(freq=520,duration=.07){
    if(!state.sound)return;
    try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(e){}
  }
  $('#soundToggle').addEventListener('click',()=>{state.sound=!state.sound;$('#soundToggle').innerHTML=`<i data-lucide="${state.sound?'volume-2':'volume-x'}"></i><span>SOUND ${state.sound?'ON':'OFF'}</span>`;if(window.lucide)lucide.createIcons();if(state.sound)beep(700,.12);toast(`INTERFACE SOUND ${state.sound?'ENABLED':'MUTED'}`)});

  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400)}
  function setState(key,value){state[key]=value;render();beep(value?680:280,.07);toast(`${key.replace(/([A-Z])/g,' $1').toUpperCase()} ${value?'ONLINE':'OFFLINE'}`)}
  function toggle(key){setState(key,!state[key])}
  function active(key){return !!state[key]}
  function subsystemOnline(name){
    if(name==='power')return state.power;
    if(name==='oxygen')return state.oxygenGen||state.oxygenCirculation;
    if(name==='hydro')return state.hydro&&state.hydroPump;
    if(name==='water')return state.waterPurification||state.waterRecycling;
    if(name==='thermal')return state.heating||state.cooling;
    if(name==='air')return state.air;
  }
  function setControl(key,value){
    state[key]=value;
    // Interlocks are simulated: dependent equipment requires main power.
    if(value && ['oxygenGen','oxygenCirculation','hydro','hydroLights','hydroPump','waterPurification','waterRecycling','heating','cooling','air'].includes(key) && !state.power){
      state[key]=false;toast('POWER BUS OFFLINE â€” START MAIN POWER FIRST');beep(210,.15);render();return;
    }
    if(key==='heating'&&value)state.cooling=false;
    if(key==='cooling'&&value)state.heating=false;
    render();beep(value?680:280,.07);toast(`${key.replace(/([A-Z])/g,' $1').toUpperCase()} ${value?'ONLINE':'OFFLINE'}`);
  }
  $$('[data-toggle]').forEach(el=>{
    if(el.type==='checkbox'){el.addEventListener('change',()=>setControl(el.dataset.toggle,el.checked))}
    else el.addEventListener('click',()=>setControl(el.dataset.toggle,!state[el.dataset.toggle]));
  });

  function setAllOff(){
    ['power','oxygenGen','oxygenCirculation','hydro','hydroLights','hydroPump','waterPurification','waterRecycling','heating','cooling','air'].forEach(k=>state[k]=false);
    state.startup=false;render();toast('MASTER SHUTDOWN COMPLETE');beep(180,.25);
  }
  $('#masterShutdown').addEventListener('click',()=>$('#shutdownModal').classList.add('show'));
  $('#cancelShutdown').addEventListener('click',()=>$('#shutdownModal').classList.remove('show'));
  $('#confirmShutdown').addEventListener('click',()=>{$('#shutdownModal').classList.remove('show');setAllOff()});
  $('#shutdownModal').addEventListener('click',e=>{if(e.target.id==='shutdownModal')$('#shutdownModal').classList.remove('show')});
  $('#systemReset').addEventListener('click',()=>{
    Object.assign(state,initial);state.elapsed=0;state.startup=false;
    $$('[data-toggle]').forEach(el=>{if(el.type==='checkbox')el.checked=false});
    $('#tempSlider').value=22;render();toast('SIMULATION PARAMETERS RESET');beep(420,.12);
  });
  async function startup(){
    if(state.startup)return;state.startup=true;$('#mainStart').disabled=true;$('#mainStart').innerHTML='<i data-lucide="loader-circle"></i> INITIALIZING';if(window.lucide)lucide.createIcons();
    const steps=[['power',true,'POWER CORE ONLINE'],['oxygenGen',true,'OXYGEN SYSTEM INITIALIZED'],['oxygenCirculation',true,'AIR CIRCULATION ESTABLISHED'],['waterPurification',true,'WATER SYSTEM INITIALIZED'],['waterRecycling',true,'WATER RECOVERY ONLINE'],['hydro',true,'HYDROPONIC BAY INITIALIZED'],['hydroPump',true,'NUTRIENT CIRCULATION ONLINE'],['hydroLights',true,'GROW LIGHTS ONLINE'],['heating',false,'THERMAL CONTROL INITIALIZED'],['air',true,'AIR FILTRATION ONLINE']];
    for(let i=0;i<steps.length;i++){const [key,val,msg]=steps[i];state[key]=val;render();toast(msg);beep(440+i*35,.06);await new Promise(r=>setTimeout(r,480))}
    state.startup=false;render();$('#mainStart').disabled=false;$('#mainStart').innerHTML='<i data-lucide="power"></i> MAIN SYSTEM START';if(window.lucide)lucide.createIcons();toast('ALL PRIMARY SYSTEMS OPERATIONAL');beep(880,.2);
  }
  $('#mainStart').addEventListener('click',startup);
  $('#tempSlider').addEventListener('input',e=>{state.setpoint=Number(e.target.value);$('#tempSetpoint').textContent=state.setpoint+' Â°C';if(state.power&&state.heating||state.cooling)render()});

  function renderGauge(id,value,color){
    const el=$('#gauge'+id),txt=$('#gauge'+id+'Value');if(el){el.style.setProperty('--value',Math.max(0,Math.min(100,value)));el.style.setProperty('--gauge-color',color);txt.textContent=Math.round(value)}
  }
  function render(){
    const power=state.power;
    const draw=(power?18:0)+(state.oxygenGen?9:0)+(state.oxygenCirculation?4:0)+(state.hydroLights?13:0)+(state.hydroPump?3:0)+(state.waterPurification?5:0)+(state.waterRecycling?4:0)+(state.heating||state.cooling?8:0)+(state.air?5:0);
    const generation=power?120:0;
    const online={power,oxygen:subsystemOnline('oxygen'),hydro:subsystemOnline('hydro'),water:subsystemOnline('water'),thermal:subsystemOnline('thermal'),air:subsystemOnline('air')};
    Object.entries(online).forEach(([k,v])=>{const pill=$('#state-'+k);pill.textContent=v?'ONLINE':'OFFLINE';pill.classList.toggle('online',v);const group=$(`[data-control="${k}"]`);if(group)group.classList.toggle('is-online',v)});
    $$('[data-toggle]').forEach(el=>{const v=!!state[el.dataset.toggle];if(el.type==='checkbox')el.checked=v;else{el.classList.toggle('online',v);el.setAttribute('aria-pressed',String(v));el.innerHTML=`<span></span> ${v?'DEACTIVATE':'ACTIVATE'} ${el.dataset.toggle==='hydro'?'HYDROPONICS':el.dataset.toggle.toUpperCase()}`}});
    $('#coreState').textContent=power?'SYSTEMS ACTIVE':'STANDBY';
    $('#vesselStatus').textContent=power?'POWER BUS ONLINE':'POWER OFFLINE';
    $('.core-ship-panel').classList.toggle('powered',power);
    $('#coreOutput').innerHTML=`${generation} <em>kW</em>`;$('#energyDraw').innerHTML=`${draw} <em>kW</em>`;$('#batteryText').innerHTML=`${Math.round(state.battery)}<em>%</em>`;
    $('#powerGeneration').textContent=generation+' kW';$('#powerConsumption').textContent=draw+' kW';$('#powerTrack').style.width=Math.min(100,draw/120*100)+'%';
    $('#oxygenReserve').textContent=Math.round(state.oxygen)+'%';$('#waterReserve').textContent=Math.round(state.water)+'%';$('#waterRecovery').textContent=state.waterRecycling?'18 L/h':'0 L/h';
    $('#oxygenCo2').textContent=state.co2.toFixed(2)+'%';$('#plantHealth').textContent=Math.round(state.hydroHealth)+'%';$('#plantWater').textContent=state.hydroPump?'12 L/h':'0 L/h';
    $('#thermalTemp').textContent=state.temp.toFixed(1)+' Â°C';$('#radiatorStatus').textContent=state.cooling?'ACTIVE':(state.heating?'BYPASS':'IDLE');$('#airQuality').textContent=Math.round(state.air)+'%';$('#filterStatus').textContent=state.air?'ACTIVE':'IDLE';
    $('#dashTemp').textContent=state.temp.toFixed(1)+' Â°C';$('#dashCo2').textContent=state.co2.toFixed(2)+' %';$('#dashHydro').textContent=Math.round(state.hydroHealth)+' %';$('#dashPower').textContent=draw+' kW';
    renderGauge('Oxygen',state.oxygen,'#56e8ff');renderGauge('Water',state.water,'#4d9fff');renderGauge('Battery',state.battery,'#a17aff');renderGauge('Air',state.air,'#58efb1');
    const health=Math.round((state.oxygen+state.water+state.battery+state.air+state.hydroHealth)/5);
    $('#healthText').textContent=health+'% / '+(health>75?'NOMINAL':health>45?'DEGRADED':'CRITICAL');$('#healthBar').style.width=health+'%';$('#healthBar').style.background=health>65?'var(--green)':health>40?'var(--orange)':'var(--red)';
    $('#healthText').style.color=health>65?'var(--green)':health>40?'var(--orange)':'var(--red)';
    updateAlerts();
  }
  function updateAlerts(){
    const alerts=[];
    if(state.oxygen<25)alerts.push(['critical','Low oxygen reserve â€” simulated crew atmosphere risk']);
    if(state.water<20)alerts.push(['critical','Low water reserve â€” rationing recommended']);
    if(state.temp>27)alerts.push(['critical','High cabin temperature â€” activate cooling']);
    if(state.battery<20)alerts.push(['critical','Power failure risk â€” battery reserve critically low']);
    if(state.co2>.18)alerts.push(['warning','COâ‚‚ concentration elevated â€” check air revitalization']);
    if(state.hydroHealth<55)alerts.push(['warning','Hydroponic health declining â€” inspect nutrient loop']);
    if(!state.power&&Object.keys(state).some(k=>['oxygenGen','oxygenCirculation','hydro','waterPurification','waterRecycling','heating','cooling','air'].includes(k)&&state[k]))alerts.push(['warning','Subsystem command detected while main power is offline']);
    $('#alertCount').textContent=String(alerts.length).padStart(2,'0');
    $('#alertList').innerHTML=alerts.length?alerts.map(([type,msg])=>`<div class="alert-item ${type==='critical'?'critical':''}"><i data-lucide="${type==='critical'?'alert-octagon':'alert-triangle'}"></i><span>${msg}</span></div>`).join(''):'<div class="no-alert"><i data-lucide="shield-check"></i> ALL SIMULATED PARAMETERS NOMINAL</div>';
    if(window.lucide)lucide.createIcons();
  }
  function tick(){
    state.elapsed++;
    // Deterministic gentle simulated drift; operating equipment stabilizes/replenishes resources.
    if(state.power){state.battery=Math.max(0,Math.min(100,state.battery+(state.battery<99?.012:-.004)-(state.battery>95?.01:0)));}else state.battery=Math.max(0,state.battery-.025);
    if(state.oxygenGen)state.oxygen=Math.min(100,state.oxygen+.035);else if(state.oxygenCirculation)state.oxygen=Math.max(0,state.oxygen-.012);
    if(state.waterRecycling)state.water=Math.min(100,state.water+.025);else if(state.hydroPump||state.waterPurification)state.water=Math.max(0,state.water-.012);
    if(state.air){state.co2=Math.max(.04,state.co2-.0008);state.air=Math.min(100,state.air+.008)}else{state.co2=Math.min(.5,state.co2+.0006);state.air=Math.max(0,state.air-.006)}
    if(state.hydro&&state.hydroPump){state.hydroHealth=Math.min(100,state.hydroHealth+.005)}else if(state.hydro)state.hydroHealth=Math.max(0,state.hydroHealth-.012);
    const target=state.heating?Math.max(state.setpoint,22):state.cooling?Math.min(state.setpoint,22):22;
    state.temp+=(target-state.temp)*.025;
    if(!state.power)state.temp+=(22-state.temp)*.002;
    $('#missionClock').textContent=[Math.floor(state.elapsed/3600),Math.floor(state.elapsed/60)%60,state.elapsed%60].map(v=>String(v).padStart(2,'0')).join(':');
    render();
  }
  render();clockTimer=setInterval(tick,1000);

  // Life support explainer switcher.
  const science={
    hydro:{title:'CLOSED-LOOP<br><span>HYDROPONICS</span>',text:'A nutrient solution is delivered directly to plant roots. Sensors monitor water level, nutrient concentration, and lighting schedules. Plant photosynthesis can contribute oxygen, but the habitat still requires engineered atmosphere management.',tags:['SOIL-FREE CULTIVATION','LED PHOTOPERIOD','NUTRIENT LOOP'],color:'#53e7a3'},
    oxygen:{title:'WATER INTO<br><span>BREATHABLE AIR</span>',text:'An electrolyzer uses electrical energy to split purified water into oxygen and hydrogen. Oxygen is conditioned, stored, and distributed through the cabin. Hydrogen is a separate stream that needs controlled handling.',tags:['ELECTROLYSIS','Oâ‚‚ STORAGE','AIR DISTRIBUTION'],color:'#54e8ff'},
    water:{title:'EVERY DROP<br><span>RECOVERED</span>',text:'Water recovery combines filtration, purification, and condensation collection. Recovered water can be checked and routed to drinking-water storage or non-potable uses such as hydroponic nutrient preparation.',tags:['FILTRATION','CONDENSATE RECOVERY','PURIFICATION'],color:'#4d9fff'},
    thermal:{title:'BALANCING<br><span>THE HEAT</span>',text:'Thermal sensors monitor cabin zones. Coolant loops and heat exchangers collect unwanted heat, while radiators reject it. Insulation and controlled heaters help prevent the cabin from becoming too cold.',tags:['TEMPERATURE SENSORS','HEAT EXCHANGERS','RADIATORS'],color:'#ff9b56'}
  };
  $$('.system-jump').forEach(btn=>btn.addEventListener('click',()=>{const d=science[btn.dataset.target];$('#scienceTitle').innerHTML=d.title;$('#scienceText').textContent=d.text;$('#scienceTags').innerHTML=d.tags.map(t=>`<span>${t}</span>`).join('');$('#scienceVisual').style.filter=`drop-shadow(0 0 22px ${d.color}44)`;$('#scienceVisual').scrollIntoView({behavior:'smooth',block:'center'});beep(550,.07)}));

  // System flow diagrams.
  const flows={
    water:{nodes:[['droplets','WATER RECOVERY','Filter + purify'],['sprout','HYDROPONICS','Nutrient delivery'],['salad','FOOD PRODUCTION','Harvest + consume']],caption:'Recovered water is purified and routed to the plant-growth loop. Some water is returned for reuse, while plants provide a supplemental source of fresh food.'},
    oxygen:{nodes:[['zap','WATER ELECTROLYSIS','Electrical separation'],['wind','OXYGEN STORAGE','Condition + store'],['users','CREW BREATHING','Cabin distribution']],caption:'Purified water is electrolyzed to produce oxygen. The oxygen stream is conditioned and delivered to the habitat atmosphere; hydrogen is managed separately.'},
    air:{nodes:[['users','CREW COâ‚‚','Exhaled air'],['filter','AIR REVITALIZATION','Remove COâ‚‚'],['wind','Oâ‚‚ CIRCULATION','Conditioned cabin air']],caption:'Crew exhale carbon dioxide. Air revitalization equipment removes COâ‚‚ and other contaminants, while circulation fans distribute conditioned air around the habitat.'},
    thermal:{nodes:[['thermometer','THERMAL SENSORS','Measure cabin zones'],['workflow','HEAT EXCHANGER','Move excess heat'],['sun','RADIATOR','Reject heat outside']],caption:'Sensors detect cabin temperatures. Coolant and heat exchangers move excess heat to radiators, while heaters and insulation help maintain a comfortable habitat.'}
  };
  $$('.flow-tab').forEach(btn=>btn.addEventListener('click',()=>{ $$('.flow-tab').forEach(b=>b.classList.toggle('active',b===btn));const f=flows[btn.dataset.flow];$('#flowStage').innerHTML=f.nodes.map((n,i)=>`${i?'<span class="flow-arrow">â†’</span>':''}<div class="flow-node"><i data-lucide="${n[0]}"></i><b>${n[1]}</b><small>${n[2]}</small></div>`).join('');$('#flowCaption').textContent=f.caption;if(window.lucide)lucide.createIcons();beep(520,.06)}));

  // Habitat room explorer.
  const rooms={
    command:['COMMAND CENTRE','The mission nerve centre. Crew monitor navigation, habitat conditions, communications, and subsystem status from a unified operations console.',['FLIGHT OPS','MISSION DATA','CREW MONITORING']],
    quarters:['CREW SLEEPING QUARTERS','Private crew cabins provide sleeping space, personal storage, lighting controls, and quiet zones for rest during long-duration missions.',['REST CYCLE','PERSONAL STORAGE','LIGHTING']],
    greenhouse:['HYDROPONIC GREENHOUSE','A controlled growing environment with nutrient channels, plant racks, LED grow lights, humidity monitoring, and harvest stations.',['FOOD GROWTH','NUTRIENT LOOP','LED LIGHTING']],
    oxygen:['OXYGEN GENERATION CHAMBER','The atmosphere-processing compartment houses conceptual electrolysis equipment, oxygen conditioning, storage, and distribution hardware.',['ELECTROLYZER','Oâ‚‚ STORAGE','DISTRIBUTION']],
    water:['WATER PURIFICATION ROOM','A multi-stage treatment zone for filtration, condensate recovery, water-quality checks, and clean-water storage.',['FILTER BANK','WATER QUALITY','RECOVERY']],
    thermal:['THERMAL MANAGEMENT ROOM','Coolant pumps, heat exchangers, valves, and thermal sensors manage heat transfer between the habitat and radiator loop.',['COOLANT LOOP','HEAT EXCHANGE','SENSORS']],
    power:['POWER & STORAGE ROOM','Energy storage, power conditioning, distribution buses, and monitoring electronics supply the habitat systems.',['BATTERY BANK','POWER BUS','LOAD CONTROL']]
  };
  $$('.room-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.room-btn').forEach(b=>b.classList.toggle('active',b===btn));const r=rooms[btn.dataset.room];$('#roomNumber').textContent='COMPARTMENT / '+String([...$$('.room-btn')].indexOf(btn)+1).padStart(2,'0');$('#roomTitle').textContent=r[0];$('#roomDescription').textContent=r[1];$('#roomChips').innerHTML=r[2].map(t=>`<span>${t}</span>`).join('');$('#roomArt').style.background=`radial-gradient(circle at center,${btn.dataset.room==='greenhouse'?'#17483f':btn.dataset.room==='thermal'?'#4a2c24':'#164469'},#091a2f 62%,#071222)`;beep(490,.06)}));

  // Optional Three.js model in the core: falls back to CSS ship if WebGL/CDN is unavailable.
  function initThree(){
    const host=$('#core3d');if(!window.THREE)return;
    try{
      const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(42,host.clientWidth/host.clientHeight,.1,100);camera.position.set(0,2.6,7.8);
      const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(host.clientWidth,host.clientHeight);renderer.outputEncoding=THREE.sRGBEncoding;host.appendChild(renderer.domElement);renderer.domElement.style.position='absolute';renderer.domElement.style.inset='0';
      scene.add(new THREE.AmbientLight(0x9bdcff,1.1));const light=new THREE.PointLight(0x4bdfff,2.4,20);light.position.set(3,4,4);scene.add(light);
      const ship=new THREE.Group();scene.add(ship);
      const metal=new THREE.MeshStandardMaterial({color:0x8bbbd3,metalness:.75,roughness:.28,emissive:0x09253c});
      const dark=new THREE.MeshStandardMaterial({color:0x23466b,metalness:.65,roughness:.32});
      const glow=new THREE.MeshBasicMaterial({color:0x45dfff});
      const body=new THREE.Mesh(new THREE.CylinderGeometry(.28,.45,3.1,8,1),metal);body.rotation.z=Math.PI/2;ship.add(body);
      const nose=new THREE.Mesh(new THREE.ConeGeometry(.3,.85,8),metal);nose.rotation.z=-Math.PI/2;nose.position.x=1.95;ship.add(nose);
      [-1,1].forEach(side=>{const wing=new THREE.Mesh(new THREE.BoxGeometry(1.45,.07,1.2),dark);wing.position.set(-.15,0,side*.75);wing.rotation.y=side*.2;ship.add(wing);const engine=new THREE.Mesh(new THREE.CylinderGeometry(.17,.2,.35,12),glow);engine.rotation.z=Math.PI/2;engine.position.x=-1.72;engine.position.z=side*.25;ship.add(engine)});
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.8,.025,6,64),glow);ring.rotation.y=Math.PI/2;ship.add(ring);
      const grid=new THREE.GridHelper(12,24,0x1e7198,0x15324a);grid.position.y=-1.3;scene.add(grid);
      const particles=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0x80dfff,size:.025}));const arr=[];for(let i=0;i<350;i++)arr.push((Math.random()-.5)*12,(Math.random()-.5)*6,(Math.random()-.5)*9);particles.geometry.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));scene.add(particles);
      let drag=false,lastX=0,lastY=0;host.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;host.setPointerCapture(e.pointerId)});host.addEventListener('pointerup',()=>drag=false);host.addEventListener('pointermove',e=>{if(drag){ship.rotation.y+=(e.clientX-lastX)*.008;ship.rotation.x+=(e.clientY-lastY)*.008;lastX=e.clientX;lastY=e.clientY}});
      function animate(){requestAnimationFrame(animate);if(!drag){ship.rotation.y+=.002;ship.rotation.x=Math.sin(Date.now()*.0004)*.08}ship.position.y=Math.sin(Date.now()*.001)*.08;particles.rotation.y+=.0002;renderer.render(scene,camera)}
      animate();const ro=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)});ro.observe(host);
      host.querySelector('.core-fallback-ship').style.opacity='.08';
    }catch(err){console.warn('3D view unavailable; CSS fallback active.',err)}
  }
  initThree();
})();
