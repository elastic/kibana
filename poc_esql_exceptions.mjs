#!/usr/bin/env node
/*
 * POC: native ES|QL exceptions.
 *
 * Sets up, against a locally running Kibana + Elasticsearch:
 *   1. A source index (poc_source) with a field per data type.
 *   2. Value lists (Kibana) + matching lookup-mode indices in ES (poc_vl_*),
 *      already normalized (deduped values / coalesced ranges) so LOOKUP JOIN
 *      is one-to-one. Value lists are NOT yet lookup-backed in Kibana; this
 *      script creates the lookup indices directly.
 *   3. One exception list + one ES|QL rule per (entry type, data type, operator)
 *      case, so included and excluded operators are tested in isolation (they
 *      cannot share a rule: an exclude-operator suppresses almost everything).
 *      Each rule is scoped with `WHERE test_case == "<caseId>"` and is tagged
 *      with the POC flag so the executor compiles the exception into the query.
 *
 * Each case has two docs: `hit` (matches the exception -> should be EXCLUDED)
 * and `miss` (does not match -> should SURVIVE as the single alert).
 *
 * Usage:
 *   node poc_esql_exceptions.mjs           # clean + create everything
 *   node poc_esql_exceptions.mjs --clean   # only delete POC artifacts
 */

const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const USER = process.env.ES_USER || 'elastic';
const PASS = process.env.ES_PASS || 'changeme';
const SPACE = process.env.SPACE || 'default';
const POC_TAG = 'poc:esql-native-exceptions';
const SOURCE_INDEX = 'poc_source';

const authHeader = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

const kbnHeaders = {
  Authorization: authHeader,
  'Content-Type': 'application/json',
  'kbn-xsrf': 'true',
  'elastic-api-version': '2023-10-31',
};
const esHeaders = { Authorization: authHeader, 'Content-Type': 'application/json' };

async function req(url, opts = {}, { ignore = [] } = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!res.ok && !ignore.includes(res.status)) {
    throw new Error(`${opts.method || 'GET'} ${url} -> ${res.status}\n${text.slice(0, 800)}`);
  }
  return { status: res.status, body };
}

const kbn = (path, method, body, ignore) =>
  req(`${KBN}${path}`, { method, headers: kbnHeaders, body: body && JSON.stringify(body) }, { ignore });
const es = (path, method, body, ignore) =>
  req(`${ES}${path}`, { method, headers: esHeaders, body: body && JSON.stringify(body) }, { ignore });

const lookupIndexNameForList = (listId) => `poc_vl_${listId.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

// ---------------------------------------------------------------------------
// Data-type catalog: a source field per ES type, with a matching value, a
// non-matching value, a second value (for match_any), and a wildcard pattern.
// ---------------------------------------------------------------------------
const TYPES = {
  keyword: { field: 'f_kw', match: 'evil.example.com', other: 'good.example.com', any2: 'bad.example.org', wc: 'evil*' },
  ip: { field: 'f_ip', match: '10.10.10.10', other: '192.168.1.1', any2: '10.10.10.11' },
  long: { field: 'f_num', match: 42, other: 7, any2: 43 },
  double: { field: 'f_dbl', match: 3.14, other: 2.71, any2: 6.28 },
  date: { field: 'f_dt', match: '2025-01-01T00:00:00.000Z', other: '2025-06-15T00:00:00.000Z', any2: '2025-02-02T00:00:00.000Z' },
  boolean: { field: 'f_bool', match: true, other: false, any2: true },
  text: { field: 'f_txt', match: 'malware detected', other: 'benign activity', any2: 'trojan found', wc: 'malware*' },
};

const SOURCE_MAPPING = {
  '@timestamp': { type: 'date' },
  test_case: { type: 'keyword' },
  label: { type: 'keyword' },
  f_kw: { type: 'keyword' },
  f_ip: { type: 'ip' },
  f_num: { type: 'long' },
  f_dbl: { type: 'double' },
  f_dt: { type: 'date' },
  f_bool: { type: 'boolean' },
  f_txt: { type: 'text' },
};

// Value lists (equality + range). id -> definition. The lookup index is derived.
const VALUE_LISTS = {
  'poc-vl-kw': { vlType: 'keyword', field: 'f_kw', values: ['evil.example.com'], inVal: 'evil.example.com', outVal: 'good.example.com' },
  'poc-vl-ip': { vlType: 'ip', field: 'f_ip', values: ['10.10.10.10'], inVal: '10.10.10.10', outVal: '192.168.1.1' },
  'poc-vl-iprange': { vlType: 'ip_range', field: 'f_ip', ranges: [['10.20.0.0', '10.20.255.255']], inVal: '10.20.5.5', outVal: '192.168.1.1' },
};

// ---------------------------------------------------------------------------
// Build the full case matrix.
// ---------------------------------------------------------------------------
const OPERATORS = ['included', 'excluded'];
const SCALAR_TYPES = ['keyword', 'ip', 'long', 'double', 'date', 'boolean', 'text'];

function buildCases() {
  const cases = [];

  const push = (entryType, typeKey, operator, extra) =>
    cases.push({ caseId: `${entryType}_${typeKey}_${operator}`, entryType, typeKey, operator, ...extra });

  // match + match_any across every data type
  for (const t of SCALAR_TYPES) {
    for (const op of OPERATORS) push('match', t, op);
    for (const op of OPERATORS) push('matchany', t, op);
  }
  // exists is type-agnostic; test on keyword
  for (const op of OPERATORS) push('exists', 'keyword', op);
  // wildcard only on string-like types
  for (const t of ['keyword', 'text']) for (const op of OPERATORS) push('wildcard', t, op);
  // list (value list): keyword, ip, ip_range
  for (const [listId, def] of Object.entries(VALUE_LISTS)) {
    for (const op of OPERATORS)
      push('list', def.vlType, op, { listId, listDef: def, caseId: `list_${def.vlType}_${op}` });
  }
  return cases;
}

const str = (v) => (typeof v === 'boolean' ? String(v) : String(v));

// For a case, produce the exception entry + the hit/miss source docs.
function materialize(c) {
  const now = new Date().toISOString();
  const base = { '@timestamp': now, test_case: c.caseId };
  const docHit = { ...base, label: 'hit' };
  const docMiss = { ...base, label: 'miss' };
  let entry;

  if (c.entryType === 'list') {
    const { field, vlType, inVal, outVal } = { field: c.listDef.field, vlType: c.listDef.vlType, inVal: c.listDef.inVal, outVal: c.listDef.outVal };
    entry = { field, operator: c.operator, type: 'list', list: { id: c.listId, type: vlType } };
    if (c.operator === 'included') {
      docHit[field] = inVal; // in list -> excluded
      docMiss[field] = outVal; // not in list -> survives
    } else {
      docHit[field] = outVal; // not in list -> excluded
      docMiss[field] = inVal; // in list -> survives
    }
    return { entry, docs: [docHit, docMiss] };
  }

  const T = TYPES[c.typeKey];
  const field = T.field;

  if (c.entryType === 'match') {
    entry = { field, operator: c.operator, type: 'match', value: str(T.match) };
    if (c.operator === 'included') {
      docHit[field] = T.match;
      docMiss[field] = T.other;
    } else {
      docHit[field] = T.other;
      docMiss[field] = T.match;
    }
  } else if (c.entryType === 'matchany') {
    const set = [...new Set([T.match, T.any2])];
    entry = { field, operator: c.operator, type: 'match_any', value: set.map(str) };
    if (c.operator === 'included') {
      docHit[field] = T.match; // in set
      docMiss[field] = T.other; // not in set
    } else {
      docHit[field] = T.other; // not in set -> excluded
      docMiss[field] = T.match; // in set -> survives
    }
  } else if (c.entryType === 'exists') {
    entry = { field, operator: c.operator, type: 'exists' };
    if (c.operator === 'included') {
      docHit[field] = T.match; // present -> excluded
      // docMiss: field absent -> survives
    } else {
      // docHit: field absent -> excluded
      docMiss[field] = T.match; // present -> survives
    }
  } else if (c.entryType === 'wildcard') {
    entry = { field, operator: c.operator, type: 'wildcard', value: T.wc };
    if (c.operator === 'included') {
      docHit[field] = T.match; // matches pattern -> excluded
      docMiss[field] = T.other;
    } else {
      docHit[field] = T.other; // does not match -> excluded
      docMiss[field] = T.match;
    }
  }
  return { entry, docs: [docHit, docMiss] };
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
async function clean(cases) {
  console.log('Cleaning up previous POC artifacts...');
  for (const c of cases) {
    await kbn(`/api/detection_engine/rules?rule_id=poc-rule-${c.caseId}`, 'DELETE', undefined, [404, 500]);
    await kbn(`/api/exception_lists?list_id=poc-exc-${c.caseId}&namespace_type=single`, 'DELETE', undefined, [404]);
  }
  for (const listId of Object.keys(VALUE_LISTS)) {
    await kbn(`/api/lists?id=${listId}`, 'DELETE', undefined, [404, 409]);
    await es(`/${lookupIndexNameForList(listId)}`, 'DELETE', undefined, [404]);
  }
  await es(`/${SOURCE_INDEX}`, 'DELETE', undefined, [404]);
}

// ---------------------------------------------------------------------------
// Setup steps
// ---------------------------------------------------------------------------
async function createSourceIndex() {
  await es(`/${SOURCE_INDEX}`, 'PUT', { mappings: { properties: SOURCE_MAPPING } });
  console.log(`Created source index ${SOURCE_INDEX}`);
}

async function createValueListsAndLookupIndices() {
  // Ensure the Kibana value-list data streams exist.
  await kbn('/api/lists/index', 'POST', undefined, [409]);

  for (const [listId, def] of Object.entries(VALUE_LISTS)) {
    // 1. Kibana value list (so the exception `list` entry is valid).
    await kbn('/api/lists', 'POST', {
      id: listId,
      name: `POC value list ${listId}`,
      description: 'POC',
      type: def.vlType,
    }, [409]);
    const items = def.vlType === 'ip_range' ? def.ranges.map((r) => `${r[0]}-${r[1]}`) : def.values;
    for (const value of items) {
      await kbn('/api/lists/items', 'POST', { list_id: listId, value }, [409]);
    }

    // 2. Lookup-mode index in ES, normalized (one row per value / coalesced range).
    const idx = lookupIndexNameForList(listId);
    if (def.vlType === 'ip_range') {
      await es(`/${idx}`, 'PUT', {
        settings: { index: { mode: 'lookup' } },
        mappings: { properties: { vl_start: { type: 'ip' }, vl_end: { type: 'ip' }, vl_mark: { type: 'keyword' } } },
      });
      const bulk = def.ranges.map((r) => `{"index":{}}\n${JSON.stringify({ vl_start: r[0], vl_end: r[1], vl_mark: '1' })}`).join('\n') + '\n';
      await es(`/${idx}/_bulk?refresh=true`, 'POST', undefined, []).catch(() => {});
      await req(`${ES}/${idx}/_bulk?refresh=true`, { method: 'POST', headers: { ...esHeaders, 'Content-Type': 'application/x-ndjson' }, body: bulk });
    } else {
      const esType = def.vlType; // 'keyword' | 'ip'
      await es(`/${idx}`, 'PUT', {
        settings: { index: { mode: 'lookup' } },
        mappings: { properties: { vl_value: { type: esType }, vl_mark: { type: 'keyword' } } },
      });
      const bulk = def.values.map((v) => `{"index":{}}\n${JSON.stringify({ vl_value: v, vl_mark: '1' })}`).join('\n') + '\n';
      await req(`${ES}/${idx}/_bulk?refresh=true`, { method: 'POST', headers: { ...esHeaders, 'Content-Type': 'application/x-ndjson' }, body: bulk });
    }
    console.log(`Created value list ${listId} + lookup index ${idx}`);
  }
}

async function createExceptionList(caseId) {
  const listId = `poc-exc-${caseId}`;
  const { body } = await kbn('/api/exception_lists', 'POST', {
    list_id: listId,
    name: `POC exception ${caseId}`,
    description: 'POC',
    type: 'detection',
    namespace_type: 'single',
  });
  return { soId: body.id, listId };
}

async function addExceptionItem(listId, caseId, entry) {
  await kbn('/api/exception_lists/items', 'POST', {
    list_id: listId,
    item_id: `poc-exc-item-${caseId}`,
    name: `POC ${caseId}`,
    description: 'POC',
    type: 'simple',
    namespace_type: 'single',
    entries: [entry],
  });
}

async function createRule(caseId, exListSoId, exListListId) {
  const { body } = await kbn('/api/detection_engine/rules', 'POST', {
    rule_id: `poc-rule-${caseId}`,
    name: `POC exc ${caseId}`,
    description: `POC native ES|QL exception: ${caseId}`,
    type: 'esql',
    language: 'esql',
    query: `FROM ${SOURCE_INDEX} METADATA _id | WHERE test_case == "${caseId}"`,
    risk_score: 21,
    severity: 'low',
    from: 'now-24h',
    interval: '5m',
    enabled: true,
    tags: [POC_TAG, `poc-case:${caseId}`],
    exceptions_list: [
      { id: exListSoId, list_id: exListListId, type: 'detection', namespace_type: 'single' },
    ],
  });
  return body.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const cases = buildCases();
  const cleanOnly = process.argv.includes('--clean');

  await clean(cases);
  if (cleanOnly) {
    console.log('Clean complete.');
    return;
  }

  await createSourceIndex();
  await createValueListsAndLookupIndices();

  const allDocs = [];
  const summary = [];

  for (const c of cases) {
    const { entry, docs } = materialize(c);
    allDocs.push(...docs);

    const { soId, listId } = await createExceptionList(c.caseId);
    await addExceptionItem(listId, c.caseId, entry);
    await createRule(c.caseId, soId, listId);

    const survivor = docs.find((d) => d.label === 'miss');
    summary.push({ caseId: c.caseId, expectAlerts: 1, survivingLabel: 'miss', survivingValue: survivor[c.entryType === 'list' ? c.listDef.field : TYPES[c.typeKey]?.field] ?? '(field absent)' });
  }

  // Index all source docs.
  const bulk = allDocs.map((d) => `{"index":{"_index":"${SOURCE_INDEX}"}}\n${JSON.stringify(d)}`).join('\n') + '\n';
  await req(`${ES}/${SOURCE_INDEX}/_bulk?refresh=true`, { method: 'POST', headers: { ...esHeaders, 'Content-Type': 'application/x-ndjson' }, body: bulk });

  console.log(`\nIndexed ${allDocs.length} source docs into ${SOURCE_INDEX}.`);
  console.log(`Created ${cases.length} exception lists + ${cases.length} ES|QL rules (tagged ${POC_TAG}).`);
  console.log('\nEach rule should produce exactly 1 alert (the "miss" doc). Cases:');
  for (const s of summary) console.log(`  ${s.caseId.padEnd(28)} expect ${s.expectAlerts} alert (survivor ${s.survivingLabel}=${s.survivingValue})`);
  console.log('\nInspect alerts:');
  console.log(`  curl -s -u ${USER}:${PASS} '${ES}/.alerts-security.alerts-${SPACE}/_search?size=200' -H 'Content-Type: application/json' -d '{"query":{"match_all":{}},"_source":["kibana.alert.rule.name","test_case","label"]}'`);
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
