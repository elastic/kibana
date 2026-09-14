#!/usr/bin/env node
/*
 * POC verification: value lists in exceptions and indicator-match rules, both
 * the legacy (shared `.items-<space>` data stream) and the new (per-list lookup
 * index) storage, coexisting in one run, covering equality AND range lists.
 *
 * Sets up:
 *   - a legacy ip value list (data stream)
 *   - a new ip value list via /api/lists (a `.value-list-default-*` lookup index)
 *   - a new ip_range lookup list populated by IMPORT (source + coalesced docs)
 *   - source docs that would become alerts
 *   - a query rule whose exception whitelists on BOTH the legacy and lookup ip lists
 *   - a query rule whose exception whitelists on the lookup ip_range list
 *   - IM rules using the legacy and the lookup list as the threat index
 *
 * Verifies (real rules + _run_soon): which docs survived to become alerts, plus
 * import/export round-trip and range coalescing. Leaves everything in place for UI
 * inspection. Re-running cleans up first, then sets up again.
 *
 * Requires: xpack.lists.enableLookupIndices: true in the running Kibana.
 * Run: node poc_value_list_verification.mjs
 */

const KBN = process.env.KIBANA_URL ?? 'http://localhost:5601/kbn';
const ES = process.env.ES_URL ?? 'http://localhost:9200';
const AUTH = 'Basic ' + Buffer.from(process.env.AUTH ?? 'elastic:changeme').toString('base64');
const SPACE = 'default';

const ITEMS_INDEX = `.items-${SPACE}`;
const SRC_INDEX = 'poc-src';
const LEGACY_LIST = 'poc-legacy-ips';
const LOOKUP_LIST = 'poc-lookup-ips';
const RANGE_LIST = 'poc-lookup-ranges';
const LOOKUP_INDEX = `.value-list-${SPACE}-${LOOKUP_LIST}`;
const RANGE_INDEX = `.value-list-${SPACE}-${RANGE_LIST}`;
const EXC_LIST = 'poc-exc-list';
const EXC_RANGE = 'poc-exc-range-list';
const RULE_EXC = 'poc-exc-query';
const RULE_EXC_RANGE = 'poc-exc-range';
const RULE_IM_LEGACY = 'poc-im-legacy';
const RULE_IM_LOOKUP = 'poc-im-lookup';
const TAG = 'poc-value-list';

const EQ_HOST = 'poc-host';
const RANGE_HOST = 'range-host';
const IN_LEGACY = '10.0.0.1'; // only in the legacy list
const IN_LOOKUP = '10.0.0.2'; // only in the lookup ip list
const IN_NEITHER = '10.0.0.99'; // in neither ip list
// three ranges that all overlap into ONE interval; B is the bridge between A and C
const RANGE_A = '10.0.0.0-10.0.0.255';
const RANGE_B = '10.0.0.200-10.0.2.50'; // bridge (deleted later -> fragments)
const RANGE_C = '10.0.2.0-10.0.2.255';
const RANGE_D = '10.0.0.250-10.0.2.10'; // re-bridge (added later -> re-merges)
const RANGE_E = '192.168.0.0-192.168.0.255'; // disjoint (added/removed to prove localized insert)
const RANGE_INITIAL = [RANGE_A, RANGE_B, RANGE_C];
const RANGE_FINAL = [RANGE_A, RANGE_C, RANGE_D]; // authored values after modify
const MERGED = '10.0.0.0-10.0.2.255'; // the single coalesced interval
const DISJOINT = '192.168.0.0-192.168.0.255'; // the disjoint interval RANGE_E coalesces to
const FRAGMENTS = ['10.0.0.0-10.0.0.255', '10.0.2.0-10.0.2.255']; // after deleting the bridge
const IN_RANGE = '10.0.1.50'; // inside the (re)merged range
const OUT_RANGE = '192.168.1.1'; // outside

const headers = {
  authorization: AUTH,
  'content-type': 'application/json',
  'kbn-xsrf': 'poc',
  'x-elastic-internal-origin': 'poc',
};

const kbn = async (method, path, body) => {
  const res = await fetch(`${KBN}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
};

const importValues = async (listId, type, values, filename) => {
  const fd = new FormData();
  fd.append('file', new Blob([values.join('\n') + '\n'], { type: 'text/plain' }), filename);
  const res = await fetch(`${KBN}/api/lists/items/_import?list_id=${listId}&type=${type}&refresh=true`, {
    method: 'POST',
    headers: { authorization: AUTH, 'kbn-xsrf': 'poc', 'x-elastic-internal-origin': 'poc' },
    body: fd,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

const exportValues = async (listId) => {
  const res = await fetch(`${KBN}/api/lists/items/_export?list_id=${listId}`, {
    method: 'POST',
    headers: { authorization: AUTH, 'kbn-xsrf': 'poc', 'x-elastic-internal-origin': 'poc' },
  });
  const text = await res.text();
  return text.split('\n').map((l) => l.trim()).filter(Boolean).sort();
};

const es = async (method, path, body) => {
  const res = await fetch(`${ES}${path}`, {
    method,
    headers: { authorization: AUTH, 'content-type': 'application/json' },
    body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, json: text ? JSON.parse(text) : {} };
  } catch {
    return { status: res.status, json: { raw: text } };
  }
};

const log = (...a) => console.log(...a);
const now = () => new Date().toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- cleanup

const cleanup = async () => {
  log('\n=== cleanup (idempotent) ===');
  for (const ruleId of [RULE_EXC, RULE_EXC_RANGE, RULE_IM_LEGACY, RULE_IM_LOOKUP]) {
    await kbn('DELETE', `/api/detection_engine/rules?rule_id=${ruleId}`);
  }
  for (const lid of [EXC_LIST, EXC_RANGE]) {
    await kbn('DELETE', `/api/exception_lists?list_id=${lid}&namespace_type=single`);
  }
  for (const id of [LOOKUP_LIST, RANGE_LIST, LEGACY_LIST]) {
    await kbn('DELETE', `/api/lists?id=${id}&deleteReferences=true`);
  }
  await es('DELETE', `/${SRC_INDEX}`);
  await es('DELETE', `/${LOOKUP_INDEX}`);
  await es('DELETE', `/${RANGE_INDEX}`);
  await es('POST', `/${ITEMS_INDEX}/_delete_by_query?refresh=true&conflicts=proceed`, {
    query: { term: { list_id: LEGACY_LIST } },
  });
  await es('POST', `/.alerts-security.alerts-default/_delete_by_query?refresh=true&conflicts=proceed&ignore_unavailable=true`, {
    query: { prefix: { 'kibana.alert.rule.name': 'POC value-list' } },
  });
  log('cleanup done');
};

// ---------------------------------------------------------------- setup

const ensureFlagActive = async () => {
  await kbn('POST', '/api/lists/index');
  const create = await kbn('POST', '/api/lists', {
    id: LOOKUP_LIST,
    type: 'ip',
    name: 'POC lookup ip list',
    description: 'per-list lookup index',
  });
  if (create.status >= 400) throw new Error(`create lookup list failed: ${JSON.stringify(create.json)}`);
  await kbn('POST', '/api/lists/items', { list_id: LOOKUP_LIST, value: IN_LOOKUP });
  await sleep(500);
  const idx = await es('GET', `/_cat/indices/${LOOKUP_INDEX}?h=index`);
  if (!String(idx.json.raw ?? idx.json).includes(LOOKUP_INDEX)) {
    throw new Error(
      `Lookup index ${LOOKUP_INDEX} was not created — the feature flag is not active.\n` +
        `Set "xpack.lists.enableLookupIndices: true" in config/kibana.dev.yml and RESTART Kibana, then re-run.`
    );
  }
  log(`lookup ip list created -> ${LOOKUP_INDEX}`);
};

const createLegacyList = async () => {
  const c = await kbn('POST', '/api/lists', {
    id: LEGACY_LIST,
    type: 'ip',
    name: 'POC legacy ip list',
    description: 'shared items data stream',
    meta: { __forceLegacy: true },
  });
  if (c.status >= 400) throw new Error(`create legacy list failed: ${JSON.stringify(c.json)}`);
  await kbn('POST', '/api/lists/items', { list_id: LEGACY_LIST, value: IN_LEGACY });
  log(`legacy ip list created (data stream, items in ${ITEMS_INDEX})`);
};

// legacy (shared .items) export now streams through the same value generator as lookup lists
const checkLegacyExport = async () => {
  const exported = await exportValues(LEGACY_LIST);
  const ok = JSON.stringify(exported) === JSON.stringify([IN_LEGACY]);
  log(`  legacy list export (shared .items via unified stream): ${JSON.stringify(exported)} ${ok ? 'PASS' : 'FAIL'}`);
  return ok;
};

// coalesced bounds currently in the range index, ascending by start
const coalescedBounds = async () => {
  const r = await es('POST', `/${RANGE_INDEX}/_search`, {
    size: 20,
    query: { term: { kind: 'coalesced' } },
    _source: ['range_start', 'range_end'],
    sort: [{ range_start: 'asc' }],
  });
  return (r.json.hits?.hits ?? []).map((h) => `${h._source.range_start}-${h._source.range_end}`);
};

// Coalescing is now asynchronous: writers journal a dirty region and the Task
// Manager job re-coalesces it (correctness lives in the synchronous source reads, so
// the coalesced projection is eventually consistent). Poll for the expected shape.
const checkCoalesced = async (label, expected, timeoutMs = 30000) => {
  const want = JSON.stringify(expected);
  const start = Date.now();
  let got = [];
  while (Date.now() - start < timeoutMs) {
    got = await coalescedBounds();
    if (JSON.stringify(got) === want) {
      log(`  ${label}: ${JSON.stringify(got)} PASS`);
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  log(`  ${label}: ${JSON.stringify(got)} FAIL (expected ${want})`);
  return false;
};

// every source doc must carry the parsed src_start/src_end bounds; the localized
// insert/delete range-query these, so their absence would silently break locality
const checkSourceBounds = async (label) => {
  const r = await es('POST', `/${RANGE_INDEX}/_search`, {
    size: 50,
    query: { term: { kind: 'source' } },
    _source: ['value', 'src_start', 'src_end'],
  });
  const hits = r.json.hits?.hits ?? [];
  const ok = hits.length > 0 && hits.every((h) => h._source.src_start != null && h._source.src_end != null);
  log(`  ${label}: ${hits.length} source docs all carry src bounds ${ok ? 'PASS' : 'FAIL'}`);
  return ok;
};

// range lookup list: IMPORT, then MODIFY (delete a bridge -> fragment, add one -> re-merge),
// then EXPORT. Verifies the coalesced projection is recalculated on every write and that
// the authored source values round-trip verbatim through the modifications.
const setupRangeListWithModifications = async () => {
  const c = await kbn('POST', '/api/lists', {
    id: RANGE_LIST,
    type: 'ip_range',
    name: 'POC lookup ip_range list',
    description: 'source + coalesced range storage',
  });
  if (c.status >= 400) throw new Error(`create range list failed: ${JSON.stringify(c.json)}`);

  // 1. import three overlapping ranges -> one merged interval
  const imp = await importValues(RANGE_LIST, 'ip_range', RANGE_INITIAL, 'ranges.txt');
  if (imp.status >= 400) throw new Error(`import ranges failed: ${imp.status} ${JSON.stringify(imp.json)}`);
  await sleep(500);
  log(`range lookup list imported ${RANGE_INITIAL.length} overlapping ranges -> ${RANGE_INDEX}`);
  const checks = [];
  checks.push(await checkCoalesced('after import (A,B,C overlap -> 1 interval)', [MERGED]));

  // 2. delete the bridge B -> the merged interval fragments into two
  await kbn('DELETE', `/api/lists/items?list_id=${RANGE_LIST}&value=${encodeURIComponent(RANGE_B)}&refresh=true`);
  await sleep(500);
  checks.push(await checkCoalesced('after delete bridge B -> fragments into 2', FRAGMENTS));

  // 3. add a new bridge D -> the two fragments re-merge into one (localized insert, merge)
  await kbn('POST', '/api/lists/items', { list_id: RANGE_LIST, value: RANGE_D });
  await sleep(500);
  checks.push(await checkCoalesced('after add bridge D -> re-merges to 1', [MERGED]));

  // 4. add a disjoint range E -> a new second interval appears, the first is untouched
  //    (localized insert only writes the affected window)
  await kbn('POST', '/api/lists/items', { list_id: RANGE_LIST, value: RANGE_E });
  await sleep(500);
  checks.push(await checkCoalesced('after add disjoint E -> 2 disjoint intervals', [MERGED, DISJOINT]));

  // 5. delete the disjoint range E -> its standalone interval is removed, the first stays
  await kbn('DELETE', `/api/lists/items?list_id=${RANGE_LIST}&value=${encodeURIComponent(RANGE_E)}&refresh=true`);
  await sleep(500);
  checks.push(await checkCoalesced('after delete disjoint E -> back to 1 interval', [MERGED]));

  // 6. every source doc carries the parsed bounds the localized paths query on
  checks.push(await checkSourceBounds('source docs carry parsed bounds'));

  // 7. export round-trips the current authored values verbatim (A, C, D)
  const exported = await exportValues(RANGE_LIST);
  const expected = [...RANGE_FINAL].sort();
  const exportOk = JSON.stringify(exported) === JSON.stringify(expected);
  log(`  export after modify: ${JSON.stringify(exported)} ${exportOk ? 'PASS' : 'FAIL (expected ' + JSON.stringify(expected) + ')'}`);
  checks.push(exportOk);

  return checks.every(Boolean);
};

const createSourceDocs = async () => {
  await es('PUT', `/${SRC_INDEX}`, {
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        destination: { properties: { ip: { type: 'ip' } } },
        host: { properties: { name: { type: 'keyword' } } },
      },
    },
  });
  const rows = [
    [IN_LEGACY, EQ_HOST],
    [IN_LOOKUP, EQ_HOST],
    [IN_NEITHER, EQ_HOST],
    [IN_RANGE, RANGE_HOST],
    [OUT_RANGE, RANGE_HOST],
  ];
  const bulk =
    rows
      .map(([ip, host]) =>
        `${JSON.stringify({ index: {} })}\n${JSON.stringify({
          '@timestamp': now(),
          destination: { ip },
          host: { name: host },
        })}`
      )
      .join('\n') + '\n';
  await es('POST', `/${SRC_INDEX}/_bulk?refresh=true`, bulk);
  log(`source docs written to ${SRC_INDEX}`);
};

const createExceptionList = async (listId, name, valueListIds) => {
  await kbn('POST', '/api/exception_lists', {
    list_id: listId,
    name,
    description: name,
    type: 'detection',
    namespace_type: 'single',
  });
  for (const { id, type } of valueListIds) {
    await kbn('POST', '/api/exception_lists/items', {
      description: `whitelist ${id}`,
      name: `whitelist ${id}`,
      list_id: listId,
      namespace_type: 'single',
      type: 'simple',
      // "included" = field value IS in the list -> that alert is excluded (whitelisted)
      entries: [{ field: 'destination.ip', operator: 'included', type: 'list', list: { id, type } }],
    });
  }
};

const baseRule = { risk_score: 50, severity: 'medium', from: 'now-1h', interval: '1m', enabled: true, tags: [TAG] };

const ruleDefs = () => ({
  [RULE_EXC]: {
    ...baseRule,
    rule_id: RULE_EXC,
    type: 'query',
    name: 'POC value-list exceptions (query, ip)',
    description: 'whitelists destination.ip in the legacy or lookup ip list',
    index: [SRC_INDEX],
    query: `host.name: "${EQ_HOST}"`,
    language: 'kuery',
    exceptions_list: [{ id: undefined, list_id: EXC_LIST, namespace_type: 'single', type: 'detection' }],
  },
  [RULE_EXC_RANGE]: {
    ...baseRule,
    rule_id: RULE_EXC_RANGE,
    type: 'query',
    name: 'POC value-list exceptions (query, ip_range)',
    description: 'whitelists destination.ip inside the lookup ip_range list',
    index: [SRC_INDEX],
    query: `host.name: "${RANGE_HOST}"`,
    language: 'kuery',
    exceptions_list: [{ id: undefined, list_id: EXC_RANGE, namespace_type: 'single', type: 'detection' }],
  },
  [RULE_IM_LEGACY]: {
    ...baseRule,
    rule_id: RULE_IM_LEGACY,
    type: 'threat_match',
    name: 'POC value-list IM legacy (threat index = .items)',
    description: 'IM using the legacy value list items index as the threat index',
    index: [SRC_INDEX],
    query: `host.name: "${EQ_HOST}"`,
    language: 'kuery',
    threat_index: [ITEMS_INDEX],
    threat_query: `list_id: "${LEGACY_LIST}"`,
    threat_language: 'kuery',
    threat_mapping: [{ entries: [{ field: 'destination.ip', type: 'mapping', value: 'ip' }] }],
  },
  [RULE_IM_LOOKUP]: {
    ...baseRule,
    rule_id: RULE_IM_LOOKUP,
    type: 'threat_match',
    name: 'POC value-list IM lookup (threat index = .value-list)',
    description: 'IM using the per-list lookup index as the threat index',
    index: [SRC_INDEX],
    query: `host.name: "${EQ_HOST}"`,
    language: 'kuery',
    threat_index: [LOOKUP_INDEX],
    threat_query: '*:*',
    threat_language: 'kuery',
    threat_mapping: [{ entries: [{ field: 'destination.ip', type: 'mapping', value: 'value' }] }],
  },
});

const excId = async (listId) => (await kbn('GET', `/api/exception_lists?list_id=${listId}&namespace_type=single`)).json.id;

const createRealRules = async (excIds) => {
  const ids = {};
  for (const [ruleId, def] of Object.entries(ruleDefs())) {
    const rule = structuredClone(def);
    if (rule.exceptions_list) {
      const eid = excIds[rule.exceptions_list[0].list_id];
      rule.exceptions_list = [{ ...rule.exceptions_list[0], id: eid }];
    }
    const r = await kbn('POST', '/api/detection_engine/rules', rule);
    if (r.status >= 400) log(`  ! create ${ruleId} -> ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
    else ids[ruleId] = r.json.id;
  }
  log('real enabled rules created (also firing every 1m for the Alerts UI)');
  return ids;
};

const runRulesNow = async (ids) => {
  for (let pass = 0; pass < 2; pass++) {
    for (const id of Object.values(ids)) await kbn('POST', `/internal/alerting/rule/${id}/_run_soon`);
    await sleep(8000);
  }
};

const realAlertsFor = async (name) => {
  const r = await es('POST', `/.alerts-security.alerts-default/_search?ignore_unavailable=true`, {
    size: 100,
    query: { term: { 'kibana.alert.rule.name': name } },
    fields: ['destination.ip'],
    _source: false,
  });
  return [...new Set((r.json.hits?.hits ?? []).map((h) => h.fields?.['destination.ip']?.[0]))].filter(Boolean).sort();
};

// ---------------------------------------------------------------- main

const main = async () => {
  await cleanup();
  log('\n=== setup ===');
  await ensureFlagActive();
  await createLegacyList();
  const rangeChecksOk = await setupRangeListWithModifications();
  const legacyExportOk = await checkLegacyExport();
  await createSourceDocs();
  await createExceptionList(EXC_LIST, 'POC ip exception list', [
    { id: LEGACY_LIST, type: 'ip' },
    { id: LOOKUP_LIST, type: 'ip' },
  ]);
  await createExceptionList(EXC_RANGE, 'POC ip_range exception list', [{ id: RANGE_LIST, type: 'ip_range' }]);
  const excIds = { [EXC_LIST]: await excId(EXC_LIST), [EXC_RANGE]: await excId(EXC_RANGE) };
  const ids = await createRealRules(excIds);

  log('\n=== running rules and verifying real alerts ===');
  await runRulesNow(ids);

  const results = [];
  const report = (label, got, expected) => {
    const ok = JSON.stringify(got) === JSON.stringify([...expected].sort());
    log(`\n${label}`);
    log(`  alerts on: ${JSON.stringify(got)}`);
    log(`  expected:  ${JSON.stringify([...expected].sort())}`);
    log(`  ${ok ? 'PASS' : 'FAIL'}`);
    results.push(ok);
    return ok;
  };

  report('Exceptions ip (whitelist on a legacy AND a lookup ip list):', await realAlertsFor(ruleDefs()[RULE_EXC].name), [IN_NEITHER]);
  report('Exceptions ip_range (whitelist on a lookup ip_range list):', await realAlertsFor(ruleDefs()[RULE_EXC_RANGE].name), [OUT_RANGE]);
  report('IM legacy (threat index = .items, list_id filter):', await realAlertsFor(ruleDefs()[RULE_IM_LEGACY].name), [IN_LEGACY]);
  report('IM lookup (threat index = per-list lookup index):', await realAlertsFor(ruleDefs()[RULE_IM_LOOKUP].name), [IN_LOOKUP]);

  log('\n=== summary ===');
  log(`  range import/modify/export:       ${rangeChecksOk ? 'PASS' : 'FAIL'}`);
  log(`  legacy export (unified stream):   ${legacyExportOk ? 'PASS' : 'FAIL'}`);
  log(`  exceptions ip (legacy+lookup):    ${results[0] ? 'PASS' : 'FAIL'}`);
  log(`  exceptions ip_range (lookup):     ${results[1] ? 'PASS' : 'FAIL'}`);
  log(`  IM legacy threat index:           ${results[2] ? 'PASS' : 'FAIL'}`);
  log(`  IM lookup threat index:           ${results[3] ? 'PASS' : 'FAIL'}`);
  log('\nData left in place. Inspect in the UI:');
  log(`  - Value lists: "${LOOKUP_LIST}" and "${RANGE_LIST}" (lookup indices), "${LEGACY_LIST}" (data stream)`);
  log(`  - Rules: tag "${TAG}" (4 enabled rules, also firing every 1m)`);
  log(`  - Alerts: rule names starting with "POC value-list"`);
  log('Re-run this script to reset and repeat.');
};

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
