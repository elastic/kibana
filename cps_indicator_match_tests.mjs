#!/usr/bin/env node
/*
 * CPS testing harness for the Indicator Match (threat_match) detection rule type
 * -----------------------------------------------------------------------------
 * Standalone Node.js (>=18, uses global fetch). No dependencies.
 *
 * What it does, per test case:
 *   1. Generates and seeds the event + indicator data into the right project(s)
 *      (origin and/or a linked project). CPS is search only, so data destined for
 *      a linked project is indexed through that project's OWN Elasticsearch, using
 *      that project's OWN API key. Where a key is not configured, the script writes
 *      the bulk file and prints a copy-pasteable curl so you can seed it yourself.
 *   2. Prints step by step instructions to create the Indicator Match rule by hand
 *      in the UI (so you also exercise the UI), including the exact fields, the
 *      space project routing to set first, and what "good" looks like.
 *
 * The scope of a detection rule under CPS is NOT a rule field. It is the space
 * default project routing, a Named Project Routing Expression (NPRE) stored in
 * Elasticsearch at /_project_routing/kibana_space_<space>_default:
 *   _alias:*        search origin + all linked projects (this is also the default
 *                   when the NPRE is missing)
 *   _alias:_origin  search the origin project only
 * The rule execution resolves this at run time and stamps each alert with
 *   kibana.cps_scope.expression      the resolved routing expression
 *   kibana.cps_scope.linked_projects the linked project ids that were in scope
 *
 * Usage:
 *   node cps_indicator_match_tests.mjs --list                 # list the cases
 *   node cps_indicator_match_tests.mjs <caseId>               # seed one case + print instructions
 *   node cps_indicator_match_tests.mjs all                    # seed every case + print instructions
 *   node cps_indicator_match_tests.mjs <caseId> --set-routing # also PUT the space NPRE for the case
 *   node cps_indicator_match_tests.mjs <caseId> --auto        # also create+enable the rule via API and poll alerts
 *   node cps_indicator_match_tests.mjs --cleanup              # delete all cps-im-* indices on every configured project
 *   node cps_indicator_match_tests.mjs --routing-status       # print the current space NPRE
 *
 * Config (env):
 *   ORIGIN_KB_URL   Kibana url of the origin project.
 *                   Default: https://keepcps-2907-origin-c2eb74.kb.us-central1.gcp.qa.elastic.cloud
 *   SPACE_ID        Kibana space. Default: default
 *   ORIGIN_API_KEY  API key for the origin project (used for ES and Kibana).
 *   CPS_KEYS        JSON object { "<projectId>": "<apiKey>", ... } for any project
 *                   you want the script to seed directly (origin and/or linked).
 *   KEYS_FILE       Path to a JSON file with the same shape as CPS_KEYS (via --keys=<path>).
 *
 * Flags: --key=value and booleans (--list, --auto, --set-routing, --cleanup, --routing-status, --keep).
 */

import fs from 'node:fs';

// ---------------------------------------------------------------------------
// Config and CLI
// ---------------------------------------------------------------------------

const ORIGIN_KB_URL =
  process.env.ORIGIN_KB_URL ||
  'https://keepcps-2907-origin-c2eb74.kb.us-central1.gcp.qa.elastic.cloud';
const SPACE_ID = process.env.SPACE_ID || 'default';
const API_VERSION = '2023-10-31'; // public detection_engine routes
const INTERNAL_API_VERSION = '1'; // internal Kibana routes

// Logical project roles used by the cases, mapped to real serverless project ids.
const PROJECT_IDS = {
  origin: 'keepcps-2907-origin-c2eb74',
  linked: 'keepcps-2907-linked-01-e997a2', // primary linked project
  linked2: 'keepcps-2907-linked-03-fdbf47', // used by the "make unavailable" case
};

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

// Derive host parts from the origin Kibana url so es/kb hosts of any project can
// be built as <projectId>.<es|kb>.<regionBase>.
function deriveHosts(originKbUrl) {
  const { protocol, host } = new URL(originKbUrl);
  const labels = host.split('.');
  // labels[0] = origin project id, labels[1] = "kb", the rest = region base.
  const regionBase = labels.slice(2).join('.');
  return {
    protocol,
    regionBase,
    esUrlFor: (id) => `${protocol}//${id}.es.${regionBase}`,
    kbUrlFor: (id) => `${protocol}//${id}.kb.${regionBase}`,
  };
}

function loadKeys(opts) {
  const keys = {};
  if (opts.keys) {
    const path = opts.keys === true ? process.env.KEYS_FILE : opts.keys;
    if (path) {
      Object.assign(keys, JSON.parse(fs.readFileSync(path, 'utf8')));
    }
  }
  if (process.env.CPS_KEYS) Object.assign(keys, JSON.parse(process.env.CPS_KEYS));
  if (process.env.ORIGIN_API_KEY) keys[PROJECT_IDS.origin] = process.env.ORIGIN_API_KEY;
  return keys;
}

// Resolve the three roles into connection objects.
function resolveProjects(opts) {
  const hosts = deriveHosts(ORIGIN_KB_URL);
  const keys = loadKeys(opts);
  const projects = {};
  for (const [role, id] of Object.entries(PROJECT_IDS)) {
    projects[role] = {
      role,
      id,
      esUrl: role === 'origin' ? hosts.esUrlFor(id) : hosts.esUrlFor(id),
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

async function esRequest(project, method, path, body, { ndjson = false } = {}) {
  if (!project.apiKey) {
    return { status: 0, body: { error: 'no-api-key' }, noKey: true };
  }
  const headers = {
    ...authHeader(project.apiKey),
    'Content-Type': ndjson ? 'application/x-ndjson' : 'application/json',
  };
  const res = await fetch(project.esUrl + path, { method, headers, body });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, body: json };
}

async function kbRequest(project, method, path, body, { internal = false } = {}) {
  const headers = {
    ...authHeader(project.apiKey),
    'Content-Type': 'application/json',
    'kbn-xsrf': 'cps-im-tests',
    'elastic-api-version': internal ? INTERNAL_API_VERSION : API_VERSION,
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
// Index names, mappings, document builders
// ---------------------------------------------------------------------------

const eventsIndex = (caseId) => `cps-im-${caseId}-events`;
const threatIndex = (caseId) => `cps-im-${caseId}-threat`;

const EVENTS_MAPPINGS = {
  mappings: {
    properties: {
      '@timestamp': { type: 'date' },
      source: { properties: { ip: { type: 'ip' } } },
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

const THREAT_MAPPINGS = {
  mappings: {
    properties: {
      '@timestamp': { type: 'date' },
      threat: {
        properties: {
          indicator: {
            properties: { ip: { type: 'ip' }, type: { type: 'keyword' } },
          },
          feed: { properties: { name: { type: 'keyword' } } },
        },
      },
      labels: {
        properties: {
          cps_case: { type: 'keyword' },
          cps_seeded_project: { type: 'keyword' },
        },
      },
    },
  },
};

const nowIso = () => new Date().toISOString();

const eventDoc = (caseId, projectId, ip, hostName) => ({
  '@timestamp': nowIso(),
  event: { category: 'network' },
  source: { ip },
  host: { name: hostName },
  labels: { cps_case: caseId, cps_seeded_project: projectId },
});

const indicatorDoc = (caseId, projectId, ip) => ({
  '@timestamp': nowIso(),
  threat: {
    feed: { name: 'cps-test-feed' },
    indicator: { ip, type: 'ipv4-addr' },
  },
  labels: { cps_case: caseId, cps_seeded_project: projectId },
});

const toBulk = (docs) =>
  docs.map((d) => `${JSON.stringify({ index: {} })}\n${JSON.stringify(d)}`).join('\n') + '\n';

// ---------------------------------------------------------------------------
// The cases. This array is the single source of truth for what gets tested.
// ---------------------------------------------------------------------------
//
// Field reference:
//   id            short id, also used in the index names (cps-im-<id>-events/-threat).
//   scenario      1..4 from the shared scenario table.
//   title         human summary.
//   routing       the space default project routing to set for this case.
//   matchIp       the value that links an event to an indicator (source.ip == threat.indicator.ip).
//   events        where the MATCHING event docs go: [{ project, host }].
//   indicators    where the MATCHING indicator docs go: [{ project }].
//   narrowingQuery optional KQL to put in the rule's event query to include/exclude events.
//   expectAlert   what "good" looks like: does any alert fire?
//   expectAlertProjects the project roles whose EVENTS should produce alerts. This is the
//                 precise "only when in scope" check: an IM alert copies its source event,
//                 which carries labels.cps_seeded_project, so we assert the exact set of
//                 projects that alerted. [] means no alert at all.
//   expectProvenance the kibana.cps_scope.expression you should see on any alert.
//   good          one line describing the expected outcome.
//   manual        semi-manual step, if any (scenario 4).

const CASES = [
  // ----- Scenario 1: cross-project match, CPS on (scope = all linked) -----
  {
    id: 's1-origin-baseline',
    scenario: 1,
    title: 'Cross-project match, baseline: matching event + indicator both on origin',
    routing: '_alias:*',
    matchIp: '10.1.1.7',
    events: [{ project: 'origin', host: 'cps-s1-origin' }],
    indicators: [{ project: 'origin' }],
    expectAlert: true,
    expectAlertProjects: ['origin'],
    expectProvenance: '_alias:*',
    good: 'Alert fires. Provenance expression is _alias:*, no linked project needed for the match.',
  },
  {
    id: 's1-linked-only',
    scenario: 1,
    title: 'Cross-project match: matching event + indicator only on a linked project',
    routing: '_alias:*',
    matchIp: '10.1.2.7',
    events: [{ project: 'linked', host: 'cps-s1-linked' }],
    indicators: [{ project: 'linked' }],
    expectAlert: true,
    expectAlertProjects: ['linked'],
    expectProvenance: '_alias:*',
    good: 'Alert fires from data that lives only on the linked project. linked_projects lists that project.',
  },
  {
    id: 's1-split-events-origin-ind-linked',
    scenario: 1,
    title: 'IM split (indicators-only-on-linked): event on origin, indicator on linked',
    routing: '_alias:*',
    matchIp: '10.1.3.7',
    events: [{ project: 'origin', host: 'cps-s1-split-a' }],
    indicators: [{ project: 'linked' }],
    expectAlert: true,
    expectAlertProjects: ['origin'],
    expectProvenance: '_alias:*',
    good: 'Alert fires only if the event/indicator join works across projects (event origin, indicator linked).',
  },
  {
    id: 's1-split-events-linked-ind-origin',
    scenario: 1,
    title: 'IM split (events-only-on-linked): event on linked, indicator on origin',
    routing: '_alias:*',
    matchIp: '10.1.4.7',
    events: [{ project: 'linked', host: 'cps-s1-split-b' }],
    indicators: [{ project: 'origin' }],
    expectAlert: true,
    expectAlertProjects: ['linked'],
    expectProvenance: '_alias:*',
    good: 'Alert fires only if the join works the other way (event linked, indicator origin).',
  },

  // ----- Scenario 1: scope isolation (the "only when in scope" proof) -----
  // Same matching pair seeded on BOTH origin and a linked project. The two cases
  // differ only in scope, so together they prove alerts are produced only for
  // in-scope data: all-linked scope alerts from both, origin-only scope alerts
  // from origin alone (the linked event and linked indicator produce nothing).
  {
    id: 's1-scopegate-all',
    scenario: 1,
    title: 'Scope isolation, all-linked: same match on origin AND linked, both should alert',
    routing: '_alias:*',
    matchIp: '10.1.5.7',
    events: [
      { project: 'origin', host: 'cps-s1gate-origin' },
      { project: 'linked', host: 'cps-s1gate-linked' },
    ],
    indicators: [{ project: 'origin' }, { project: 'linked' }],
    expectAlert: true,
    expectAlertProjects: ['origin', 'linked'],
    expectProvenance: '_alias:*',
    good: 'Alerts for BOTH the origin event and the linked event. Scope _alias:* includes the linked project.',
  },
  {
    id: 's1-scopegate-origin',
    scenario: 1,
    title: 'Scope isolation, origin-only (negative control): same match on origin AND linked, only origin alerts',
    routing: '_alias:_origin',
    matchIp: '10.1.6.7',
    events: [
      { project: 'origin', host: 'cps-s1gate2-origin' },
      { project: 'linked', host: 'cps-s1gate2-linked' },
    ],
    indicators: [{ project: 'origin' }, { project: 'linked' }],
    expectAlert: true,
    expectAlertProjects: ['origin'],
    expectProvenance: '_alias:_origin',
    good:
      'ONLY the origin event alerts. The identical matching data on the linked project is out of scope and produces nothing. This is the proof that alerts come only from in-scope data.',
  },

  // ----- Scenario 2: no leak / local only, origin-scoped -----
  {
    id: 's2-leakbait-linked',
    scenario: 2,
    title: 'No leak: origin-scoped rule, matching leak-bait only on a linked project',
    routing: '_alias:_origin',
    matchIp: '10.2.1.7',
    events: [{ project: 'linked', host: 'cps-s2-leak' }],
    indicators: [{ project: 'linked' }],
    expectAlert: false,
    expectAlertProjects: [],
    expectProvenance: '_alias:_origin',
    good: 'No alert. The origin-scoped rule cannot see the leak-bait that lives only on the linked project.',
  },
  {
    id: 's2-origin-still-alerts',
    scenario: 2,
    title: 'No leak control: origin-scoped rule, matching data on origin still alerts',
    routing: '_alias:_origin',
    matchIp: '10.2.2.7',
    events: [{ project: 'origin', host: 'cps-s2-origin' }],
    indicators: [{ project: 'origin' }],
    expectAlert: true,
    expectAlertProjects: ['origin'],
    expectProvenance: '_alias:_origin',
    good: 'Alert fires. Origin data still alerts normally while scope is origin only.',
  },

  // ----- Scenario 3: narrowing still works, CPS on (scope = all linked) -----
  {
    id: 's3-narrowing',
    scenario: 3,
    title: 'Narrowing still works: two matching hosts across projects, event query keeps one',
    routing: '_alias:*',
    matchIp: '10.3.1.7',
    // Two matching events sharing the same indicator ip: host A on origin, host B on linked.
    events: [
      { project: 'origin', host: 'cps-s3-keep' },
      { project: 'linked', host: 'cps-s3-drop' },
    ],
    indicators: [{ project: 'origin' }, { project: 'linked' }],
    narrowingQuery: 'host.name: "cps-s3-keep"',
    expectAlert: true,
    expectAlertProjects: ['origin'],
    expectProvenance: '_alias:*',
    good:
      'Only the cps-s3-keep event alerts. Narrowing applies inside every in-scope project and does not reach outside scope.',
  },

  // ----- Scenario 4: linked project unavailable, CPS on -----
  {
    id: 's4-linked-unavailable',
    scenario: 4,
    title: 'Linked project unavailable: matching data on a linked project, then make it unavailable',
    routing: '_alias:*',
    matchIp: '10.4.1.7',
    // Uses the secondary linked project so making it unavailable does not disturb the others.
    events: [{ project: 'linked2', host: 'cps-s4' }],
    indicators: [{ project: 'linked2' }],
    expectAlert: true,
    expectAlertProjects: ['linked2'],
    expectProvenance: '_alias:*',
    good:
      'While the linked project is available the rule alerts. After you make it unavailable, note the behavior (error / partial / skip), whether origin still alerts, and anything surprising in the UI and execution log.',
    manual:
      'After the first run alerts, make the linked project keepcps-2907-linked-03-fdbf47 unavailable (cloud console: pause or unlink it), then run the rule again and record what happens.',
  },
];

const caseById = (id) => CASES.find((c) => c.id === id);

// ---------------------------------------------------------------------------
// Space project routing (NPRE)
// ---------------------------------------------------------------------------

const npreName = `kibana_space_${SPACE_ID}_default`;

async function getRouting(origin) {
  // Read the stored NPRE straight from Elasticsearch. The Kibana route
  // (/internal/cps/project_routing/...) is an internal API and is blocked for
  // external callers on serverless ("exists but is not available with the current
  // configuration"), so we go to ES directly.
  const res = await esRequest(origin, 'GET', `/_project_routing/${npreName}`);
  if (res.noKey) return { status: 0, expression: '(no API key)' };
  if (res.status === 404) return { status: 404, expression: '(none set: rules fall back to _alias:*)' };
  const expr =
    (res.body && (res.body.expression || (res.body[npreName] && res.body[npreName].expression))) ||
    JSON.stringify(res.body);
  return { status: res.status, expression: expr };
}

async function setRouting(origin, expression) {
  // Raw ES PUT. Requires a key allowed to set project routing expressions.
  const res = await esRequest(
    origin,
    'PUT',
    `/_project_routing/${npreName}`,
    JSON.stringify({ expression })
  );
  return res;
}

const setRoutingCurl = (origin, expression) =>
  `curl -sS -XPUT "${origin.esUrl}/_project_routing/${npreName}" \\\n` +
  `  -H "Authorization: ApiKey ${origin.apiKey || '$ORIGIN_API_KEY'}" \\\n` +
  `  -H "Content-Type: application/json" \\\n` +
  `  -d '{"expression":"${expression}"}'`;

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

async function ensureIndex(project, index, mappings) {
  const head = await esRequest(project, 'GET', `/${index}`);
  if (head.noKey) return { noKey: true };
  if (head.status === 200) return { existed: true };
  const created = await esRequest(project, 'PUT', `/${index}`, JSON.stringify(mappings));
  return { created: created.status === 200, status: created.status, body: created.body };
}

async function bulkSeed(project, index, docs) {
  const res = await esRequest(project, 'POST', `/${index}/_bulk?refresh=wait_for`, toBulk(docs), {
    ndjson: true,
  });
  if (res.noKey) return { noKey: true };
  const errored = res.body && res.body.errors;
  return { ok: res.status === 200 && !errored, status: res.status, body: res.body };
}

const bulkCurl = (project, index, docs) => {
  const dir = `${process.cwd()}/.cps-im-bulk`;
  fs.mkdirSync(dir, { recursive: true });
  const file = `${dir}/${project.id}__${index}.ndjson`;
  fs.writeFileSync(file, toBulk(docs));
  const keyRef = project.apiKey || `$${project.role.toUpperCase()}_API_KEY`;
  return (
    `# ${project.id}: no API key configured, seed it yourself.\n` +
    `# 1. create the index mapping (only needed once):\n` +
    `curl -sS -XPUT "${project.esUrl}/${index}" -H "Authorization: ApiKey ${keyRef}" \\\n` +
    `  -H "Content-Type: application/json" -d '${JSON.stringify(
      index.endsWith('-threat') ? THREAT_MAPPINGS : EVENTS_MAPPINGS
    )}'\n` +
    `# 2. bulk index the documents (written to ${file}):\n` +
    `curl -sS -XPOST "${project.esUrl}/${index}/_bulk?refresh=wait_for" \\\n` +
    `  -H "Authorization: ApiKey ${keyRef}" -H "Content-Type: application/x-ndjson" \\\n` +
    `  --data-binary @${file}`
  );
};

// Build the { projectRole -> { events:[docs], indicators:[docs] } } plan for a case.
function buildPlan(tc) {
  const plan = {};
  const add = (role, kind, doc) => {
    plan[role] = plan[role] || { events: [], indicators: [] };
    plan[role][kind].push(doc);
  };
  for (const e of tc.events) add(e.project, 'events', eventDoc(tc.id, PROJECT_IDS[e.project], tc.matchIp, e.host));
  for (const i of tc.indicators) add(i.project, 'indicators', indicatorDoc(tc.id, PROJECT_IDS[i.project], tc.matchIp));
  return plan;
}

async function seedCase(tc, projects, opts) {
  console.log(`\n=== Seeding data for case ${tc.id} (scenario ${tc.scenario}) ===`);
  console.log(`  ${tc.title}`);
  const plan = buildPlan(tc);
  const manualCurls = [];

  for (const [role, data] of Object.entries(plan)) {
    const project = projects[role];
    const jobs = [];
    if (data.events.length) jobs.push(['events', eventsIndex(tc.id), EVENTS_MAPPINGS, data.events]);
    if (data.indicators.length) jobs.push(['threat', threatIndex(tc.id), THREAT_MAPPINGS, data.indicators]);

    for (const [kind, index, mappings, docs] of jobs) {
      if (!project.apiKey) {
        console.log(`  [${project.id}] ${kind}: no key, printing manual seed command.`);
        manualCurls.push(bulkCurl(project, index, docs));
        continue;
      }
      const idx = await ensureIndex(project, index, mappings);
      if (idx.created === false && !idx.existed) {
        console.log(`  [${project.id}] ${index}: index create failed (status ${idx.status}): ${JSON.stringify(idx.body)}`);
        continue;
      }
      const seed = await bulkSeed(project, index, docs);
      console.log(
        `  [${project.id}] ${index}: ${seed.ok ? `seeded ${docs.length} doc(s)` : `FAILED (status ${seed.status}) ${JSON.stringify(seed.body).slice(0, 200)}`}`
      );
    }
  }

  if (manualCurls.length) {
    console.log('\n  --- Manual seed commands (no API key for these projects) ---');
    for (const c of manualCurls) console.log('\n' + c);
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Manual rule creation instructions
// ---------------------------------------------------------------------------

function printInstructions(tc, projects) {
  const origin = projects.origin;
  const evIdx = eventsIndex(tc.id);
  const thIdx = threatIndex(tc.id);
  const line = '-'.repeat(78);

  console.log(`\n${line}`);
  console.log(`MANUAL STEPS for ${tc.id} (scenario ${tc.scenario})`);
  console.log(line);

  console.log(`\nStep 1. Set the space project routing (CPS scope) to: ${tc.routing}`);
  console.log('  Detection rules take their CPS scope from the space default routing, not the rule.');
  console.log('  Verify current value (read the stored NPRE straight from Elasticsearch;');
  console.log('  the Kibana /internal/cps route is blocked for external callers on serverless):');
  console.log(
    `    curl -sS "${origin.esUrl}/_project_routing/${npreName}" \\\n` +
      `      -H "Authorization: ApiKey ${origin.apiKey || '$ORIGIN_API_KEY'}"`
  );
  console.log('  Set it for this case:');
  console.log('    ' + setRoutingCurl(origin, tc.routing).split('\n').join('\n    '));

  console.log('\nStep 2. Create the Indicator Match rule in the UI (Security > Rules > Create new rule):');
  console.log('  Rule type:               Indicator Match');
  console.log(`  Index patterns (source): ${evIdx}`);
  console.log(`  Custom query:            ${tc.narrowingQuery ? tc.narrowingQuery : '*:*'}`);
  console.log(`  Indicator index pattern: ${thIdx}`);
  console.log('  Indicator index query:   *:*');
  console.log('  Indicator mapping:       source.ip  MATCHES  threat.indicator.ip');
  console.log('  Schedule:                every 1m, additional look-back time 1h');
  console.log(`  Suggested rule name:     CPS IM ${tc.id}`);
  if (tc.narrowingQuery) {
    console.log(`  Narrowing note:          the custom query above (${tc.narrowingQuery}) is the include/exclude control for this case.`);
  }

  console.log('\nStep 3. Expected result (what "good" looks like):');
  console.log(`  Alert should fire:       ${tc.expectAlert ? 'YES' : 'NO'}`);
  const expectIds = (tc.expectAlertProjects || []).map((r) => PROJECT_IDS[r]);
  console.log(
    `  Alerts only from:        ${expectIds.length ? expectIds.join(', ') : '(none: no alert expected)'}`
  );
  console.log(`  ${tc.good}`);
  if (tc.expectAlert) {
    console.log('  How to confirm which project each alert came from:');
    console.log('    On each alert, the copied source event carries labels.cps_seeded_project');
    console.log(`    (and a host.name of cps-...). It must be one of: ${expectIds.join(', ')}.`);
    console.log('    Any alert whose labels.cps_seeded_project is a project NOT listed above means');
    console.log('    out-of-scope data leaked into the results.');
    console.log('  Provenance to check on the alert document:');
    console.log(`    kibana.cps_scope.expression      == ${tc.expectProvenance}`);
    console.log('    kibana.cps_scope.linked_projects  == the linked project id(s) that were in scope');
  }

  if (tc.manual) {
    console.log('\nStep 4. Semi-manual step for this case:');
    console.log('  ' + tc.manual);
  }
  console.log(line);
}

// ---------------------------------------------------------------------------
// Optional: create + enable the rule via API and poll for alerts (--auto)
// ---------------------------------------------------------------------------

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function autoVerify(tc, projects, opts) {
  const origin = projects.origin;
  if (!origin.apiKey) {
    console.log('\n[--auto] skipped: no origin API key configured.');
    return;
  }
  const ruleId = `cps-im-${tc.id}`;
  const body = {
    rule_id: ruleId,
    name: `CPS IM ${tc.id}`,
    description: tc.title,
    risk_score: 50,
    severity: 'high',
    type: 'threat_match',
    index: [eventsIndex(tc.id)],
    query: tc.narrowingQuery || '*:*',
    language: 'kuery',
    threat_index: [threatIndex(tc.id)],
    threat_query: '*:*',
    threat_indicator_path: 'threat.indicator',
    threat_mapping: [
      { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
    ],
    from: 'now-1h',
    interval: '1m',
    enabled: true,
  };

  // Clean any prior rule with this rule_id, then create fresh.
  await kbRequest(origin, 'DELETE', `/api/detection_engine/rules?rule_id=${ruleId}`);
  const created = await kbRequest(origin, 'POST', '/api/detection_engine/rules', body);
  if (created.status !== 200) {
    console.log(`\n[--auto] rule create failed (status ${created.status}): ${JSON.stringify(created.body).slice(0, 300)}`);
    return;
  }
  console.log(`\n[--auto] created + enabled rule ${ruleId} (uuid ${created.body.id}). Polling for alerts...`);

  // Read a field that may be stored nested (labels.cps_seeded_project) or flattened
  // ("labels.cps_seeded_project" as a literal dotted key) depending on the alert shape.
  const readField = (src, dotted) => {
    if (src[dotted] !== undefined) return src[dotted];
    return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), src);
  };
  const seededProjects = (hits) =>
    new Set(hits.map((a) => readField(a._source || {}, 'labels.cps_seeded_project')).filter(Boolean));

  // Poll. For cases that expect alerts, keep going until every expected source
  // project has alerted (so a slow second project is not missed). For no-alert
  // cases, poll to the deadline to be confident nothing shows up.
  const expectIds = (tc.expectAlertProjects || []).map((r) => PROJECT_IDS[r]);
  const deadline = Date.now() + Number(opts['auto-timeout'] || 180) * 1000;
  let alerts = [];
  while (Date.now() < deadline) {
    await wait(10000);
    const search = await kbRequest(origin, 'POST', '/api/detection_engine/signals/search', {
      query: { bool: { filter: [{ term: { 'kibana.alert.rule.rule_id': ruleId } }] } },
      size: 50,
    });
    alerts = search.body && search.body.hits && search.body.hits.hits ? search.body.hits.hits : [];
    if (expectIds.length && expectIds.every((id) => seededProjects(alerts).has(id))) break;
    process.stdout.write('.');
  }
  console.log('');

  const got = alerts.length > 0;
  const countPass = got === tc.expectAlert;
  console.log(
    `[--auto] alerts found: ${alerts.length} (expected ${tc.expectAlert ? '>=1' : '0'}) -> ${countPass ? 'PASS' : 'CHECK'}`
  );

  // The precise "only in scope" check: which projects did the alerting events come from?
  const expectedIds = (tc.expectAlertProjects || []).map((r) => PROJECT_IDS[r]).sort();
  const actualIds = [
    ...new Set(alerts.map((a) => readField(a._source || {}, 'labels.cps_seeded_project')).filter(Boolean)),
  ].sort();
  const setPass = JSON.stringify(expectedIds) === JSON.stringify(actualIds);
  console.log(
    `[--auto] alerting source projects: [${actualIds.join(', ')}] (expected [${expectedIds.join(', ')}]) -> ${setPass ? 'PASS' : 'CHECK'}`
  );
  const leaked = actualIds.filter((id) => !expectedIds.includes(id));
  if (leaked.length) {
    console.log(`[--auto] OUT-OF-SCOPE LEAK: alerts came from projects that should not be in scope: [${leaked.join(', ')}]`);
  }

  if (got) {
    const src = alerts[0]._source || {};
    const scope = readField(src, 'kibana.cps_scope.expression');
    const linked = readField(src, 'kibana.cps_scope.linked_projects');
    console.log(
      `[--auto] alert provenance: expression=${JSON.stringify(scope)} linked_projects=${JSON.stringify(linked)} (expected expression ${tc.expectProvenance})`
    );
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup(projects) {
  console.log('\n=== Cleanup: deleting cps-im-* indices on every configured project ===');
  for (const project of Object.values(projects)) {
    if (!project.apiKey) {
      console.log(`  [${project.id}] no key, skipping (delete manually: DELETE ${project.esUrl}/cps-im-*).`);
      continue;
    }
    const res = await esRequest(project, 'DELETE', '/cps-im-*');
    console.log(`  [${project.id}] delete cps-im-* -> status ${res.status}`);
  }
  console.log('  Note: rules created with --auto are named cps-im-<id>; delete them from the UI or with the rules API.');
}

// ---------------------------------------------------------------------------
// Full verification run (--verify-all): seed, create rule via API, poll,
// collect the provenance fields, and emit a markdown report. Cases are grouped
// by routing so the shared space scope is set once per group, and each rule is
// deleted after its alerts are captured so it cannot re-run under a later scope.
// ---------------------------------------------------------------------------

const readField = (src, dotted) => {
  if (src[dotted] !== undefined) return src[dotted];
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), src);
};

async function deleteCaseData(tc, projects) {
  const plan = buildPlan(tc);
  for (const role of Object.keys(plan)) {
    const p = projects[role];
    if (!p.apiKey) continue;
    await esRequest(p, 'DELETE', `/${eventsIndex(tc.id)}`);
    await esRequest(p, 'DELETE', `/${threatIndex(tc.id)}`);
  }
}

// Non-destructive seed: index the declared docs only where the target index has
// none yet, so re-running never duplicates data and never deletes anything.
async function ensureSeeded(tc, projects) {
  const plan = buildPlan(tc);
  for (const [role, data] of Object.entries(plan)) {
    const p = projects[role];
    const jobs = [];
    if (data.events.length) jobs.push([eventsIndex(tc.id), EVENTS_MAPPINGS, data.events]);
    if (data.indicators.length) jobs.push([threatIndex(tc.id), THREAT_MAPPINGS, data.indicators]);
    for (const [index, mappings, docs] of jobs) {
      const cnt = await esRequest(p, 'GET', `/${index}/_count`);
      if (cnt.status === 200 && cnt.body && cnt.body.count > 0) {
        console.log(`  [${p.id}] ${index}: already has ${cnt.body.count} doc(s), leaving as is`);
        continue;
      }
      await ensureIndex(p, index, mappings);
      const seed = await bulkSeed(p, index, docs);
      console.log(`  [${p.id}] ${index}: ${seed.ok ? `seeded ${docs.length} doc(s)` : `FAILED ${JSON.stringify(seed.body).slice(0, 160)}`}`);
    }
  }
}

// Look up a rule's object id (needed for bulk disable) from its rule_id.
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

function ruleBodyFor(tc) {
  return {
    rule_id: `cps-im-${tc.id}`,
    name: `CPS IM ${tc.id}`,
    description: tc.title,
    risk_score: 50,
    severity: 'high',
    type: 'threat_match',
    index: [eventsIndex(tc.id)],
    query: tc.narrowingQuery || '*:*',
    language: 'kuery',
    threat_index: [threatIndex(tc.id)],
    threat_query: '*:*',
    threat_indicator_path: 'threat.indicator',
    threat_mapping: [
      { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
    ],
    from: 'now-1h',
    interval: '1m',
    enabled: true,
  };
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
  const linkedPresent = linkedVals.some(
    (v) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)
  );
  const actualIds = [
    ...new Set(alerts.map((a) => readField(a._source || {}, 'labels.cps_seeded_project')).filter(Boolean)),
  ].sort();
  return { exprs, linkedPresent, linkedSample: linkedVals.find((v) => v != null), actualIds };
}

function renderMarkdown(byId) {
  const lines = [
    '# Indicator Match CPS verifications',
    '',
    '_Rules named `CPS IM <case>` and their seeded `cps-im-*` indices are left in place for inspection._',
    '_Each rule was disabled after its alerts were captured (re-enable in the UI to continue). Space routing restored to `_alias:*`._',
    '',
  ];
  for (const tc of CASES) {
    lines.push(`- \`${tc.id}\` (scenario ${tc.scenario})`);
    lines.push(`  ${tc.title}`);
    const r = byId.get(tc.id);
    if (!r) {
      lines.push('  (not run)');
      continue;
    }
    const { alerts, analysis } = r;
    const expectIds = (tc.expectAlertProjects || []).map((x) => PROJECT_IDS[x]).sort();
    const countOk = (alerts.length > 0) === tc.expectAlert;
    lines.push(
      `  Alerts created: ${alerts.length} ${countOk ? '✅' : '❌'}${tc.expectAlert ? '' : ' (expected 0)'}`
    );
    if (alerts.length) {
      const exprOk = analysis.exprs.length === 1 && analysis.exprs[0] === tc.expectProvenance;
      const exprStr = analysis.exprs.map((e) => `\`${e}\``).join(', ') || '(none)';
      lines.push(
        `  \`kibana.cps_scope.expression\`: ${exprStr} ${exprOk ? '✅' : `❌ (expected \`${tc.expectProvenance}\`)`}`
      );
      lines.push(
        `  \`kibana.cps_scope.linked_projects\`: ${analysis.linkedPresent ? '`' + JSON.stringify(analysis.linkedSample) + '`' : 'NOT PRESENT'}`
      );
      const labelsOk = JSON.stringify(analysis.actualIds) === JSON.stringify(expectIds);
      lines.push(
        `  \`labels.cps_seeded_project\`: ${analysis.actualIds.map((i) => `\`${i}\``).join(', ')} ${labelsOk ? '✅' : `❌ (expected ${expectIds.map((i) => '`' + i + '`').join(', ')})`}`
      );
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
    console.log(`  PUT ${npreName} = ${routing} -> status ${set.status} ${set.status !== 200 ? JSON.stringify(set.body).slice(0, 200) : ''}`);
    const now = await getRouting(origin);
    console.log(`  routing now: ${now.expression}`);
    if (now.expression !== routing) {
      console.log('  WARNING: routing did not take the expected value; results for this group may be wrong.');
    }

    for (const tc of group) {
      console.log(`\n### ${tc.id}`);
      await ensureSeeded(tc, projects);
      const ruleId = `cps-im-${tc.id}`;
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
      console.log(`  alerts=${alerts.length} projects=[${analysis.actualIds.join(', ')}] expr=[${analysis.exprs.join(', ')}]`);
      // Non-destructive: disable (do not delete) so the rule and its alerts stay
      // for inspection, and so it cannot re-run under a later group's scope.
      if (objId) {
        const dis = await disableRule(origin, objId);
        console.log(`  disabled rule ${ruleId} -> status ${dis.status}`);
      }
    }
  }

  const restore = await setRouting(origin, '_alias:*');
  console.log(`\nRestored routing to _alias:* -> status ${restore.status}`);

  const md = renderMarkdown(byId);
  fs.writeFileSync(`${process.cwd()}/cps_im_verifications.md`, md);
  console.log('\n\n===== MARKDOWN (also written to cps_im_verifications.md) =====\n');
  console.log(md);
}

// ---------------------------------------------------------------------------
// Preflight and main
// ---------------------------------------------------------------------------

async function preflight(projects) {
  for (const project of Object.values(projects)) {
    if (!project.apiKey) {
      console.log(`  [${project.role}] ${project.id}: no API key (data will be printed as manual curl commands).`);
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
    console.log(`  ${c.id.padEnd(38)} (scenario ${c.scenario})  ${c.title}`);
  }
  console.log('\nRun one:  node cps_indicator_match_tests.mjs <caseId>');
  console.log('Run all:  node cps_indicator_match_tests.mjs all');
}

async function main() {
  const { target, opts } = parseArgs(process.argv.slice(2));
  const projects = resolveProjects(opts);

  if (opts.list) return printList();

  console.log(`Origin Kibana: ${projects.origin.kbUrl}`);
  console.log(`Origin ES:     ${projects.origin.esUrl}`);
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

  if (!target) {
    printList();
    return;
  }

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
        console.log(`\n[--set-routing] PUT ${npreName} = ${tc.routing} -> status ${res.status} ${res.status !== 200 ? JSON.stringify(res.body).slice(0, 200) : ''}`);
      }
    }
    await seedCase(tc, projects, opts);
    printInstructions(tc, projects);
    if (opts.auto) await autoVerify(tc, projects, opts);
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err.stack || err.message);
  process.exit(1);
});
