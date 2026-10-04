#!/usr/bin/env node
/*
 * CPS testing harness for the New Terms detection rule type
 * -----------------------------------------------------------------------------
 * Standalone Node.js (>=18, uses global fetch). No dependencies.
 *
 * Same shape as the Indicator Match harness (cps_indicator_match_tests.mjs): per
 * case it seeds the data into the right project(s) and prints step by step
 * instructions to create the rule by hand in the UI. It can also create the rule
 * via API and poll alerts (--verify-all / --auto).
 *
 * New Terms focus for CPS: the "already seen" history must respect scope.
 *   - A term that is new in scope must still alert even if an OUT-OF-SCOPE project
 *     has that value in its history (out-of-scope history must not suppress).
 *   - A term whose value already exists in an IN-SCOPE project's history must NOT
 *     alert (in-scope history must suppress, across projects).
 * The rule applies the same project routing to BOTH its recent-window search and
 * its history-window search, so scope drives both. Scope is the space default
 * project routing (NPRE) stored in Elasticsearch:
 *   _alias:*        origin + all linked projects (also the default when unset)
 *   _alias:_origin  origin only
 * Each alert is stamped with kibana.cps_scope.expression (the resolved routing)
 * and kibana.cps_scope.linked_projects (linked projects in scope; populated only
 * for a rule principal that can enumerate them, and hidden in the alerts table
 * view but present in the alert JSON).
 *
 * TIME SENSITIVITY: New Terms compares a recent window [from, now] against a
 * history window [history_window_start, from]. A doc seeded as "recent" ages into
 * the history window on a later run and would then suppress its own term. So this
 * script RESEEDS FRESH by default (it deletes the case index and re-indexes with
 * current timestamps) so recent docs are always inside the rule window. Pass
 * --keep to skip the reset (older recent docs may then cause false negatives).
 *
 * Usage:
 *   node cps_new_terms_tests.mjs --list
 *   node cps_new_terms_tests.mjs <caseId>               # seed one case + print instructions
 *   node cps_new_terms_tests.mjs all
 *   node cps_new_terms_tests.mjs <caseId> --set-routing # also PUT the space NPRE for the case
 *   node cps_new_terms_tests.mjs --verify-all           # seed + create rules via API + poll + markdown
 *   node cps_new_terms_tests.mjs --cleanup              # delete all cps-nt-* indices on every project
 *   node cps_new_terms_tests.mjs --routing-status
 *
 * Config (env): ORIGIN_KB_URL, SPACE_ID, ORIGIN_API_KEY, CPS_KEYS (JSON map
 *   { "<projectId>": "<apiKey>" }), KEYS_FILE (via --keys=<path>). Same as the IM harness.
 */

import fs from 'node:fs';

// ---------------------------------------------------------------------------
// Config and CLI
// ---------------------------------------------------------------------------

const ORIGIN_KB_URL =
  process.env.ORIGIN_KB_URL ||
  'https://keepcps-2907-origin-c2eb74.kb.us-central1.gcp.qa.elastic.cloud';
const SPACE_ID = process.env.SPACE_ID || 'default';
const API_VERSION = '2023-10-31';

// Project ids, overridable to point around a degraded project. Precedence:
// CLI flag (--linked=<id>) > env (LINKED_ID) > default. applyProjectOverrides
// mutates this in place at startup so every downstream reference sees the choice.
const PROJECT_IDS = {
  origin: 'keepcps-2907-origin-c2eb74',
  linked: 'keepcps-2907-linked-01-e997a2',
  linked2: 'keepcps-2907-linked-03-fdbf47',
};

function applyProjectOverrides(opts) {
  const pick = (role, envKey) => {
    if (typeof opts[role] === 'string') PROJECT_IDS[role] = opts[role];
    else if (process.env[envKey]) PROJECT_IDS[role] = process.env[envKey];
  };
  pick('origin', 'ORIGIN_ID');
  pick('linked', 'LINKED_ID');
  pick('linked2', 'LINKED2_ID');
}

// Recent docs land 5 minutes ago (inside from=now-1h). History docs land 2 days
// ago (inside history_window_start=now-7d, and older than from).
const AGO_MIN = { recent: 5, history: 60 * 24 * 2 };

function parseArgs(argv) {
  const opts = {};
  let target = null;
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [k, v] = arg.slice(2).split('=');
      opts[k] = v === undefined ? true : v;
    } else if (!target) {
      target = arg;
    }
  }
  return { target, opts };
}

function deriveHosts(originKbUrl) {
  const { protocol, host } = new URL(originKbUrl);
  const labels = host.split('.');
  const regionBase = labels.slice(2).join('.');
  return {
    esUrlFor: (id) => `${protocol}//${id}.es.${regionBase}`,
    kbUrlFor: (id) => `${protocol}//${id}.kb.${regionBase}`,
  };
}

function loadKeys(opts) {
  const keys = {};
  if (opts.keys) {
    const path = opts.keys === true ? process.env.KEYS_FILE : opts.keys;
    if (path) Object.assign(keys, JSON.parse(fs.readFileSync(path, 'utf8')));
  }
  if (process.env.CPS_KEYS) Object.assign(keys, JSON.parse(process.env.CPS_KEYS));
  if (process.env.ORIGIN_API_KEY) keys[PROJECT_IDS.origin] = process.env.ORIGIN_API_KEY;
  return keys;
}

function resolveProjects(opts) {
  const hosts = deriveHosts(ORIGIN_KB_URL);
  const keys = loadKeys(opts);
  const projects = {};
  for (const [role, id] of Object.entries(PROJECT_IDS)) {
    projects[role] = {
      role,
      id,
      esUrl: hosts.esUrlFor(id),
      kbUrl: role === 'origin' ? ORIGIN_KB_URL : hosts.kbUrlFor(id),
      apiKey: keys[id] || null,
    };
  }
  return projects;
}

// ---------------------------------------------------------------------------
// HTTP clients
// ---------------------------------------------------------------------------

const authHeader = (apiKey) => (apiKey ? { Authorization: `ApiKey ${apiKey}` } : {});

async function esRequest(project, method, path, body, { ndjson = false, timeoutMs = 35000 } = {}) {
  if (!project.apiKey) return { status: 0, body: { error: 'no-api-key' }, noKey: true };
  const headers = {
    ...authHeader(project.apiKey),
    'Content-Type': ndjson ? 'application/x-ndjson' : 'application/json',
  };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(project.esUrl + path, { method, headers, body, signal: ac.signal });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { _raw: text };
    }
    return { status: res.status, body: json };
  } catch (e) {
    // Timeout / abort / network error: report as a transient failure so callers can retry.
    return { status: 0, body: { error: String((e && e.message) || e) }, aborted: true };
  } finally {
    clearTimeout(timer);
  }
}

async function kbRequest(project, method, path, body) {
  const headers = {
    ...authHeader(project.apiKey),
    'Content-Type': 'application/json',
    'kbn-xsrf': 'cps-nt-tests',
    'elastic-api-version': API_VERSION,
  };
  const res = await fetch(project.kbUrl + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, body: json };
}

// ---------------------------------------------------------------------------
// Index, mappings, documents
// ---------------------------------------------------------------------------

const ntIndex = (caseId) => `cps-nt-${caseId}`;

const NT_MAPPINGS = {
  mappings: {
    properties: {
      '@timestamp': { type: 'date' },
      user: { properties: { name: { type: 'keyword' } } },
      host: { properties: { name: { type: 'keyword' } } },
      event: { properties: { category: { type: 'keyword' } } },
      labels: {
        properties: {
          cps_case: { type: 'keyword' },
          cps_seeded_project: { type: 'keyword' },
        },
      },
    },
  },
};

const agoIso = (min) => new Date(Date.now() - min * 60000).toISOString();

const ntDoc = (caseId, projectId, value, agoMin, host) => ({
  '@timestamp': agoIso(agoMin),
  event: { category: 'authentication' },
  user: { name: value },
  host: { name: host || `cps-nt-${projectId}` },
  labels: { cps_case: caseId, cps_seeded_project: projectId },
});

const toBulk = (docs) =>
  docs.map((d) => `${JSON.stringify({ index: {} })}\n${JSON.stringify(d)}`).join('\n') + '\n';

// ---------------------------------------------------------------------------
// The cases. Single source of truth.
// ---------------------------------------------------------------------------
//
//   id            short id, also the index name (cps-nt-<id>).
//   scenario      1..4 for the shared table; 'history' for the New Terms focus.
//   routing       space default project routing to set for this case.
//   newTermsFields default ['user.name'].
//   historyWindowStart default 'now-7d'.
//   seed          the exact documents to index: [{ project, value, when, agoMin?, host? }].
//                 when: 'recent' (inside the rule window) | 'history' (older, the
//                 "already seen" window). agoMin overrides the default minutes-ago.
//   narrowingQuery optional KQL for the rule's event query (include/exclude).
//   expectAlert   does any alert fire?
//   expectAlertProjects project roles whose INTRODUCING doc should alert (the alert
//                 copies the introducing event, which carries labels.cps_seeded_project).
//   expectValues  the new term value(s) expected to alert.
//   expectProvenance kibana.cps_scope.expression you should see.
//   good          one line describing the expected outcome.
//   manual        semi-manual note (scenario 4).

const V = (id) => `cps-nt-${id}`; // per-case term value

const CASES = [
  // ----- Scenario 1: cross-project, CPS on (scope all linked) -----
  {
    id: 's1-origin-baseline',
    scenario: 1,
    title: 'Cross-project new term, baseline: new value in origin recent window',
    routing: '_alias:*',
    seed: [{ project: 'origin', value: V('s1o'), when: 'recent', host: 'cps-nt-s1-origin' }],
    expectAlert: true,
    expectAlertProjects: ['origin'],
    expectValues: [V('s1o')],
    expectProvenance: '_alias:*',
    good: 'New value with no prior history alerts. Introducing doc is on origin.',
  },
  {
    id: 's1-linked-only',
    scenario: 1,
    title: 'Cross-project new term: new value appears only in a linked project recent window',
    routing: '_alias:*',
    seed: [{ project: 'linked', value: V('s1l'), when: 'recent', host: 'cps-nt-s1-linked' }],
    expectAlert: true,
    expectAlertProjects: ['linked'],
    expectValues: [V('s1l')],
    expectProvenance: '_alias:*',
    good: 'The new value lives only on the linked project (in scope) and alerts, attributed to the linked doc.',
  },
  {
    id: 's1-split-both-recent',
    scenario: 1,
    title: 'Cross-project new term appears in both recent windows: one alert, earliest doc wins',
    routing: '_alias:*',
    // Same value in both recent windows; linked is earlier so it is the introducing doc.
    seed: [
      { project: 'linked', value: V('s1s'), when: 'recent', agoMin: 6, host: 'cps-nt-s1-split-linked' },
      { project: 'origin', value: V('s1s'), when: 'recent', agoMin: 5, host: 'cps-nt-s1-split-origin' },
    ],
    expectAlert: true,
    expectAlertProjects: ['linked'],
    expectValues: [V('s1s')],
    expectProvenance: '_alias:*',
    good: 'One new value across two projects collapses to a single alert attributed to the earliest (linked) doc, not one per project.',
  },

  // ----- Scenario 2: no leak / origin-only -----
  {
    id: 's2-leakbait-linked',
    scenario: 2,
    title: 'No leak: origin-scoped rule, new value only in a linked recent window',
    routing: '_alias:_origin',
    seed: [{ project: 'linked', value: V('s2l'), when: 'recent', host: 'cps-nt-s2-linked' }],
    expectAlert: false,
    expectAlertProjects: [],
    expectValues: [],
    expectProvenance: '_alias:_origin',
    good: 'No alert. The origin-scoped rule cannot see the new value that lives only on the linked project.',
  },
  {
    id: 's2-origin-still-alerts',
    scenario: 2,
    title: 'No leak control: origin-scoped rule, new value in origin recent window still alerts',
    routing: '_alias:_origin',
    seed: [{ project: 'origin', value: V('s2o'), when: 'recent', host: 'cps-nt-s2-origin' }],
    expectAlert: true,
    expectAlertProjects: ['origin'],
    expectValues: [V('s2o')],
    expectProvenance: '_alias:_origin',
    good: 'Origin data still alerts normally while scope is origin only.',
  },

  // ----- Scenario 3: narrowing, CPS on -----
  {
    id: 's3-narrowing',
    scenario: 3,
    title: 'Narrowing still works: two new values across projects, event query keeps one',
    routing: '_alias:*',
    seed: [
      { project: 'origin', value: V('s3-keep'), when: 'recent', host: 'cps-nt-keep' },
      { project: 'linked', value: V('s3-drop'), when: 'recent', host: 'cps-nt-drop' },
    ],
    narrowingQuery: 'host.name: "cps-nt-keep"',
    expectAlert: true,
    expectAlertProjects: ['origin'],
    expectValues: [V('s3-keep')],
    expectProvenance: '_alias:*',
    good: 'Only the kept host new value alerts. The query excludes the linked drop value inside scope; it is not searched outside scope.',
  },

  // ----- Scenario 4: linked project unavailable -----
  {
    id: 's4-linked-unavailable',
    scenario: 4,
    title: 'Linked project unavailable: new value on a linked project, then make it unavailable',
    routing: '_alias:*',
    seed: [{ project: 'linked2', value: V('s4'), when: 'recent', host: 'cps-nt-s4' }],
    expectAlert: true,
    expectAlertProjects: ['linked2'],
    expectValues: [V('s4')],
    expectProvenance: '_alias:*',
    good: 'While the linked project is available the new value alerts. After you make it unavailable, note behavior (error / partial / skip) and whether origin still alerts.',
    manual:
      'After the first run alerts, make keepcps-2907-linked-03-fdbf47 unavailable (cloud console: pause or unlink it), then run the rule again and record what happens.',
  },

  // ----- New Terms focus: "already seen" history must respect scope -----
  {
    id: 'hist-origin-suppresses',
    scenario: 'history',
    title: 'History control: value in origin history + origin recent is not new (no alert)',
    routing: '_alias:*',
    seed: [
      { project: 'origin', value: V('h0'), when: 'history', host: 'cps-nt-h0' },
      { project: 'origin', value: V('h0'), when: 'recent', host: 'cps-nt-h0' },
    ],
    expectAlert: false,
    expectAlertProjects: [],
    expectValues: [],
    expectProvenance: '_alias:*',
    good: 'Baseline that history suppression works: a value already present in the history window is not treated as new.',
  },
  {
    id: 'hist-inscope-suppresses',
    scenario: 'history',
    title: 'In-scope history suppresses: value in LINKED history + origin recent, scope all-linked',
    routing: '_alias:*',
    seed: [
      { project: 'linked', value: V('h1'), when: 'history', host: 'cps-nt-h1' },
      { project: 'origin', value: V('h1'), when: 'recent', host: 'cps-nt-h1' },
    ],
    expectAlert: false,
    expectAlertProjects: [],
    expectValues: [],
    expectProvenance: '_alias:*',
    good: 'No alert. The value was already seen in an IN-SCOPE linked project history, so it is not new. In-scope history suppresses across projects.',
  },
  {
    id: 'hist-outscope-no-suppress',
    scenario: 'history',
    title: 'Out-of-scope history does NOT suppress: same data as hist-inscope, scope origin-only',
    routing: '_alias:_origin',
    seed: [
      { project: 'linked', value: V('h2'), when: 'history', host: 'cps-nt-h2' },
      { project: 'origin', value: V('h2'), when: 'recent', host: 'cps-nt-h2' },
    ],
    expectAlert: true,
    expectAlertProjects: ['origin'],
    expectValues: [V('h2')],
    expectProvenance: '_alias:_origin',
    good: 'Alerts. Identical data to hist-inscope-suppresses, but the linked history is OUT of scope and must not suppress. The value is new from the origin perspective. This is the core focus result.',
  },
];

const caseById = (id) => CASES.find((c) => c.id === id);

// ---------------------------------------------------------------------------
// Space project routing (NPRE)
// ---------------------------------------------------------------------------

const npreName = `kibana_space_${SPACE_ID}_default`;

async function getRouting(origin) {
  const res = await esRequest(origin, 'GET', `/_project_routing/${npreName}`);
  if (res.noKey) return { status: 0, expression: '(no API key)' };
  if (res.status === 404) return { status: 404, expression: '(none set: rules fall back to _alias:*)' };
  const expr =
    (res.body && (res.body.expression || (res.body[npreName] && res.body[npreName].expression))) ||
    JSON.stringify(res.body);
  return { status: res.status, expression: expr };
}

async function setRouting(origin, expression) {
  return esRequest(origin, 'PUT', `/_project_routing/${npreName}`, JSON.stringify({ expression }));
}

const setRoutingCurl = (origin, expression) =>
  `curl -sS -XPUT "${origin.esUrl}/_project_routing/${npreName}" \\\n` +
  `  -H "Authorization: ApiKey ${origin.apiKey || '$ORIGIN_API_KEY'}" \\\n` +
  `  -H "Content-Type: application/json" \\\n` +
  `  -d '{"expression":"${expression}"}'`;

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

function buildPlan(tc) {
  const plan = {};
  for (const d of tc.seed) {
    const agoMin = d.agoMin != null ? d.agoMin : AGO_MIN[d.when];
    (plan[d.project] = plan[d.project] || []).push(
      ntDoc(tc.id, PROJECT_IDS[d.project], d.value, agoMin, d.host)
    );
  }
  return plan;
}

async function ensureIndex(project, index, mappings) {
  const head = await esRequest(project, 'GET', `/${index}`);
  if (head.noKey) return { noKey: true };
  if (head.status === 200) return { existed: true };
  const created = await esRequest(project, 'PUT', `/${index}`, JSON.stringify(mappings));
  return { created: created.status === 200, status: created.status, body: created.body };
}

// Bulk with retry: a freshly allocated index (or a busy linked project) can return
// a transient 503 unavailable_shards_exception; back off and retry a few times.
async function bulkSeed(project, index, docs) {
  const attempts = 4;
  let last;
  for (let i = 0; i < attempts; i++) {
    const res = await esRequest(project, 'POST', `/${index}/_bulk?refresh=wait_for`, toBulk(docs), {
      ndjson: true,
    });
    if (res.noKey) return { noKey: true };
    const body = res.body || {};
    if (res.status === 200 && !body.errors) return { ok: true };
    const transient =
      res.status === 503 ||
      res.aborted ||
      (Array.isArray(body.items) && body.items.some((it) => it.index && it.index.status === 503));
    last = { ok: false, status: res.status, body };
    if (transient && i < attempts - 1) {
      console.log(`  [${project.id}] ${index}: transient 503 (unavailable shards), retry in ${3 * (i + 1)}s`);
      await wait(3000 * (i + 1));
      continue;
    }
    return last;
  }
  return last;
}

// Clear a case index without dropping it, to avoid the delete/recreate shard race.
async function clearIndex(project, index) {
  return esRequest(
    project,
    'POST',
    `/${index}/_delete_by_query?refresh=true&conflicts=proceed`,
    JSON.stringify({ query: { match_all: {} } })
  );
}

const bulkCurl = (project, index, docs) => {
  const dir = `${process.cwd()}/.cps-nt-bulk`;
  fs.mkdirSync(dir, { recursive: true });
  const file = `${dir}/${project.id}__${index}.ndjson`;
  fs.writeFileSync(file, toBulk(docs));
  const keyRef = project.apiKey || `$${project.role.toUpperCase()}_API_KEY`;
  return (
    `# ${project.id}: no API key configured, seed it yourself.\n` +
    `curl -sS -XPUT "${project.esUrl}/${index}" -H "Authorization: ApiKey ${keyRef}" \\\n` +
    `  -H "Content-Type: application/json" -d '${JSON.stringify(NT_MAPPINGS)}'\n` +
    `curl -sS -XPOST "${project.esUrl}/${index}/_bulk?refresh=wait_for" \\\n` +
    `  -H "Authorization: ApiKey ${keyRef}" -H "Content-Type: application/x-ndjson" \\\n` +
    `  --data-binary @${file}`
  );
};

// New Terms is time sensitive: reseed fresh by default so recent docs stay inside
// the rule window. --keep skips the delete and appends instead.
async function seedCase(tc, projects, opts) {
  console.log(`\n=== Seeding data for case ${tc.id} (scenario ${tc.scenario}) ===`);
  console.log(`  ${tc.title}`);
  const plan = buildPlan(tc);
  const manualCurls = [];

  for (const [role, docs] of Object.entries(plan)) {
    const project = projects[role];
    const index = ntIndex(tc.id);
    if (!project.apiKey) {
      console.log(`  [${project.id}] ${index}: no key, printing manual seed command.`);
      manualCurls.push(bulkCurl(project, index, docs));
      continue;
    }
    const idx = await ensureIndex(project, index, NT_MAPPINGS);
    if (idx.created === false && !idx.existed) {
      console.log(`  [${project.id}] ${index}: index create failed (${idx.status}): ${JSON.stringify(idx.body).slice(0, 160)}`);
      continue;
    }
    // Reseed fresh by default: clear existing docs (keep the index) so recent docs
    // stay inside the rule window. A just-created index is already empty.
    if (!opts.keep && idx.existed) await clearIndex(project, index);
    const seed = await bulkSeed(project, index, docs);
    console.log(
      `  [${project.id}] ${index}: ${seed.ok ? `seeded ${docs.length} doc(s)` : `FAILED (${seed.status}) ${JSON.stringify(seed.body).slice(0, 160)}`}`
    );
  }

  if (manualCurls.length) {
    console.log('\n  --- Manual seed commands (no API key for these projects) ---');
    for (const c of manualCurls) console.log('\n' + c);
  }
}

// ---------------------------------------------------------------------------
// Manual rule creation instructions
// ---------------------------------------------------------------------------

function dataNote(tc) {
  return tc.seed
    .map((d) => `${PROJECT_IDS[d.project]} ${d.when} user.name=${d.value}`)
    .join('; ');
}

function printInstructions(tc, projects) {
  const origin = projects.origin;
  const idx = ntIndex(tc.id);
  const fields = (tc.newTermsFields || ['user.name']).join(', ');
  const history = tc.historyWindowStart || 'now-7d';
  const line = '-'.repeat(78);

  console.log(`\n${line}`);
  console.log(`MANUAL STEPS for ${tc.id} (scenario ${tc.scenario})`);
  console.log(line);
  console.log(`\nSeeded data: ${dataNote(tc)}`);

  console.log(`\nStep 1. Set the space project routing (CPS scope) to: ${tc.routing}`);
  console.log('  New Terms takes its CPS scope from the space default routing (both the recent and');
  console.log('  the history searches run under it), not from the rule.');
  console.log('  Verify current value (read the stored NPRE from Elasticsearch):');
  console.log(
    `    curl -sS "${origin.esUrl}/_project_routing/${npreName}" \\\n` +
      `      -H "Authorization: ApiKey ${origin.apiKey || '$ORIGIN_API_KEY'}"`
  );
  console.log('  Set it for this case:');
  console.log('    ' + setRoutingCurl(origin, tc.routing).split('\n').join('\n    '));

  console.log('\nStep 2. Create the New Terms rule in the UI (Security > Rules > Create new rule):');
  console.log('  Rule type:               New Terms');
  console.log(`  Index patterns:          ${idx}`);
  console.log(`  Custom query:            ${tc.narrowingQuery ? tc.narrowingQuery : '*:*'}`);
  console.log(`  Fields (new terms):      ${fields}`);
  console.log(`  History Window Start:    ${history} (UI "History Window Size", e.g. 7 days)`);
  console.log('  Schedule:                every 1m, additional look-back time 1h');
  console.log(`  Suggested rule name:     CPS NT ${tc.id}`);

  console.log('\nStep 3. Expected result (what "good" looks like):');
  console.log(`  Alert should fire:       ${tc.expectAlert ? 'YES' : 'NO'}`);
  const expectIds = (tc.expectAlertProjects || []).map((r) => PROJECT_IDS[r]);
  console.log(`  Alerts only from:        ${expectIds.length ? expectIds.join(', ') : '(none: no alert expected)'}`);
  if (tc.expectValues && tc.expectValues.length) {
    console.log(`  New term value(s):       ${tc.expectValues.join(', ')} (kibana.alert.new_terms)`);
  }
  console.log(`  ${tc.good}`);
  if (tc.expectAlert) {
    console.log('  Provenance on the alert document:');
    console.log(`    kibana.cps_scope.expression      == ${tc.expectProvenance}`);
    console.log('    kibana.cps_scope.linked_projects  == in-scope linked projects (in the alert JSON;');
    console.log('                                         hidden in the alerts table view)');
    console.log('    labels.cps_seeded_project         == the project of the introducing doc');
  }
  if (tc.manual) {
    console.log('\nStep 4. Semi-manual step for this case:');
    console.log('  ' + tc.manual);
  }
  console.log(line);
}

// ---------------------------------------------------------------------------
// Full verification run (--verify-all)
// ---------------------------------------------------------------------------

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const readField = (src, dotted) => {
  if (src[dotted] !== undefined) return src[dotted];
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), src);
};

function ruleBodyFor(tc) {
  return {
    rule_id: `cps-nt-${tc.id}`,
    name: `CPS NT ${tc.id}`,
    description: tc.title,
    risk_score: 50,
    severity: 'high',
    type: 'new_terms',
    index: [ntIndex(tc.id)],
    query: tc.narrowingQuery || '*:*',
    language: 'kuery',
    new_terms_fields: tc.newTermsFields || ['user.name'],
    history_window_start: tc.historyWindowStart || 'now-7d',
    from: 'now-1h',
    interval: '1m',
    enabled: true,
  };
}

async function ruleObjectId(origin, ruleId) {
  const found = await kbRequest(origin, 'GET', `/api/detection_engine/rules?rule_id=${ruleId}`);
  return found.body && found.body.id;
}

async function disableRule(origin, objectId) {
  return kbRequest(origin, 'POST', '/api/detection_engine/rules/_bulk_action', {
    action: 'disable',
    ids: [objectId],
  });
}

async function pollForAlerts(origin, ruleId, expectIds, timeoutS) {
  const deadline = Date.now() + timeoutS * 1000;
  let alerts = [];
  while (Date.now() < deadline) {
    await wait(10000);
    const search = await kbRequest(origin, 'POST', '/api/detection_engine/signals/search', {
      query: { bool: { filter: [{ term: { 'kibana.alert.rule.rule_id': ruleId } }] } },
      size: 100,
    });
    alerts = (search.body && search.body.hits && search.body.hits.hits) || [];
    const seen = new Set(
      alerts.map((a) => readField(a._source || {}, 'labels.cps_seeded_project')).filter(Boolean)
    );
    if (expectIds.length && expectIds.every((id) => seen.has(id))) break;
  }
  return alerts;
}

function analyzeCase(alerts) {
  const exprs = [
    ...new Set(alerts.map((a) => readField(a._source || {}, 'kibana.cps_scope.expression')).filter((v) => v !== undefined)),
  ];
  const linkedVals = alerts.map((a) => readField(a._source || {}, 'kibana.cps_scope.linked_projects'));
  const linkedPresent = linkedVals.some((v) => Array.isArray(v) && v.length > 0);
  const actualIds = [
    ...new Set(alerts.map((a) => readField(a._source || {}, 'labels.cps_seeded_project')).filter(Boolean)),
  ].sort();
  const values = [
    ...new Set(alerts.flatMap((a) => readField(a._source || {}, 'kibana.alert.new_terms') || [])),
  ].sort();
  return { exprs, linkedPresent, actualIds, values };
}

function renderMarkdown(byId) {
  const lines = [
    '# New Terms CPS verifications',
    '',
    '_Rules named `CPS NT <case>` and their `cps-nt-*` indices are left in place. Each rule was disabled_',
    '_after its alerts were captured. Space routing restored to `_alias:*`. New Terms data was reseeded_',
    '_fresh (delete + re-index) so recent docs stay inside the rule window._',
    '',
  ];
  for (const tc of CASES) {
    lines.push(`- \`${tc.id}\` (scenario ${tc.scenario})`);
    lines.push(`  ${tc.title}`);
    lines.push(`  Seeded: ${dataNote(tc)}`);
    const r = byId.get(tc.id);
    if (!r) {
      lines.push('  (not run)');
      continue;
    }
    const { alerts, analysis } = r;
    const expectIds = (tc.expectAlertProjects || []).map((x) => PROJECT_IDS[x]).sort();
    const countOk = (alerts.length > 0) === tc.expectAlert;
    lines.push(`  Alerts created: ${alerts.length} ${countOk ? '✅' : '❌'}${tc.expectAlert ? '' : ' (expected 0)'}`);
    if (alerts.length) {
      const exprOk = analysis.exprs.length === 1 && analysis.exprs[0] === tc.expectProvenance;
      lines.push(`  \`kibana.cps_scope.expression\`: ${analysis.exprs.map((e) => `\`${e}\``).join(', ')} ${exprOk ? '✅' : `❌ (expected \`${tc.expectProvenance}\`)`}`);
      lines.push(`  \`kibana.cps_scope.linked_projects\`: ${analysis.linkedPresent ? 'present in JSON' : 'empty (rule principal cannot enumerate)'}`);
      const labelsOk = JSON.stringify(analysis.actualIds) === JSON.stringify(expectIds);
      lines.push(`  \`labels.cps_seeded_project\`: ${analysis.actualIds.map((i) => `\`${i}\``).join(', ')} ${labelsOk ? '✅' : `❌ (expected ${expectIds.map((i) => '`' + i + '`').join(', ')})`}`);
      lines.push(`  \`kibana.alert.new_terms\`: ${analysis.values.map((v) => `\`${v}\``).join(', ') || '(none)'}`);
    } else {
      lines.push(`  ${tc.expectAlert ? '❌ expected an alert, none appeared' : '✅ no alert, as expected'}`);
    }
    if (tc.manual) lines.push(`  Note: available-state only. ${tc.manual}`);
  }
  return lines.join('\n') + '\n';
}

async function verifyAll(projects, opts) {
  const origin = projects.origin;
  const skip = new Set((opts.skip || '').split(',').filter(Boolean));
  const selected = CASES.filter((c) => !skip.has(c.id));
  const original = await getRouting(origin);
  console.log(`Original space routing: ${original.expression}`);

  const byId = new Map();
  const routings = [...new Set(selected.map((c) => c.routing))];
  for (const routing of routings) {
    const group = selected.filter((c) => c.routing === routing);
    console.log(`\n##### Routing group ${routing} (${group.length} case(s)) #####`);
    const set = await setRouting(origin, routing);
    console.log(`  PUT ${npreName} = ${routing} -> status ${set.status}`);
    const now = await getRouting(origin);
    console.log(`  routing now: ${now.expression}`);

    for (const tc of group) {
      console.log(`\n### ${tc.id}`);
      await seedCase(tc, projects, opts);
      const ruleId = `cps-nt-${tc.id}`;
      const created = await kbRequest(origin, 'POST', '/api/detection_engine/rules', ruleBodyFor(tc));
      let objId = created.status === 200 ? created.body.id : undefined;
      if (created.status === 409) {
        objId = await ruleObjectId(origin, ruleId);
        console.log(`  rule ${ruleId} already exists, reusing id ${objId}`);
      } else {
        console.log(`  rule create -> status ${created.status}${created.status !== 200 ? ' ' + JSON.stringify(created.body).slice(0, 200) : ''}`);
      }
      const expectIds = (tc.expectAlertProjects || []).map((r) => PROJECT_IDS[r]);
      const timeoutS = Number(opts['auto-timeout'] || (tc.expectAlert ? 200 : 110));
      const alerts = await pollForAlerts(origin, ruleId, expectIds, timeoutS);
      const analysis = analyzeCase(alerts);
      byId.set(tc.id, { alerts, analysis });
      console.log(`  alerts=${alerts.length} projects=[${analysis.actualIds.join(', ')}] values=[${analysis.values.join(', ')}] expr=[${analysis.exprs.join(', ')}]`);
      if (objId) {
        const dis = await disableRule(origin, objId);
        console.log(`  disabled rule ${ruleId} -> status ${dis.status}`);
      }
    }
  }

  const restore = await setRouting(origin, '_alias:*');
  console.log(`\nRestored routing to _alias:* -> status ${restore.status}`);

  const md = renderMarkdown(byId);
  fs.writeFileSync(`${process.cwd()}/cps_nt_verifications.md`, md);
  console.log('\n\n===== MARKDOWN (also written to cps_nt_verifications.md) =====\n');
  console.log(md);
}

// ---------------------------------------------------------------------------
// Cleanup, preflight, main
// ---------------------------------------------------------------------------

async function cleanup(projects) {
  console.log('\n=== Cleanup: deleting cps-nt-* indices on every configured project ===');
  // Serverless blocks wildcard/all-index deletes, so enumerate then delete by name.
  for (const project of Object.values(projects)) {
    if (!project.apiKey) {
      console.log(`  [${project.id}] no key, skipping.`);
      continue;
    }
    const cat = await esRequest(project, 'GET', '/_cat/indices/cps-nt-*?h=index&format=json');
    const names = Array.isArray(cat.body) ? cat.body.map((r) => r.index).filter(Boolean) : [];
    if (!names.length) {
      console.log(`  [${project.id}] no cps-nt-* indices${cat.status !== 200 ? ` (status ${cat.status})` : ''}`);
      continue;
    }
    for (const name of names) {
      const res = await esRequest(project, 'DELETE', `/${encodeURIComponent(name)}`);
      console.log(`  [${project.id}] delete ${name} -> status ${res.status}`);
    }
  }
  console.log('  Rules created with --verify-all are named cps-nt-<id>; delete them from the UI or rules API.');
}

async function preflight(projects) {
  for (const project of Object.values(projects)) {
    if (!project.apiKey) {
      console.log(`  [${project.role}] ${project.id}: no API key (data printed as manual curl commands).`);
      continue;
    }
    const res = await esRequest(project, 'GET', '/');
    const name = res.body && res.body.version ? res.body.version.number : `status ${res.status}`;
    console.log(`  [${project.role}] ${project.id}: ES reachable (${name}).`);
  }
}

function printList() {
  console.log('\nCases:');
  for (const c of CASES) {
    console.log(`  ${c.id.padEnd(28)} (scenario ${String(c.scenario).padEnd(8)})  ${c.title}`);
  }
  console.log('\nRun one:  node cps_new_terms_tests.mjs <caseId>');
  console.log('Run all:  node cps_new_terms_tests.mjs all');
}

async function main() {
  const { target, opts } = parseArgs(process.argv.slice(2));
  applyProjectOverrides(opts);
  const projects = resolveProjects(opts);

  if (opts.list) return printList();

  console.log(`Origin Kibana: ${projects.origin.kbUrl}`);
  console.log(`Origin ES:     ${projects.origin.esUrl}`);
  console.log(`Projects:      origin=${PROJECT_IDS.origin}  linked=${PROJECT_IDS.linked}  linked2=${PROJECT_IDS.linked2}`);
  console.log(`Space:         ${SPACE_ID} (NPRE ${npreName})`);
  console.log('\nPreflight:');
  await preflight(projects);

  if (opts['verify-all']) return verifyAll(projects, opts);

  if (opts['routing-status']) {
    const r = await getRouting(projects.origin);
    console.log(`\nCurrent space routing (${npreName}): ${r.expression} [status ${r.status}]`);
    return;
  }

  if (opts.cleanup) return cleanup(projects);

  if (!target) return printList();

  const selected = target === 'all' ? CASES : [caseById(target)].filter(Boolean);
  if (!selected.length) {
    console.error(`Unknown case "${target}". Use --list to see the case ids.`);
    process.exit(1);
  }

  for (const tc of selected) {
    if (opts['set-routing']) {
      const res = await setRouting(projects.origin, tc.routing);
      if (res.noKey) {
        console.log(`\n[--set-routing] no origin key, set it manually:\n${setRoutingCurl(projects.origin, tc.routing)}`);
      } else {
        console.log(`\n[--set-routing] PUT ${npreName} = ${tc.routing} -> status ${res.status}`);
      }
    }
    await seedCase(tc, projects, opts);
    printInstructions(tc, projects);
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err.stack || err.message);
  process.exit(1);
});
