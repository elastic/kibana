#!/usr/bin/env node
/*
 * Exhaustive A/B comparison: for every field type, run the SAME rule + exception
 * once through the V1 path and once through the POC path (rule preview, isolated per
 * type), and diff the resulting alerts.
 *
 * Method per test: a rule `FROM src | WHERE tcase == "<id>"` scoped to that test's
 * two docs (a "bad" doc that the exception should exclude, a "good" doc that should
 * survive). Preview it twice, once with a plain name (V1 path), once with a name
 * containing "POC EXCEPTIONS" (POC path). Compare the surviving doc ids and content.
 * V1 is the baseline; the POC is checked against V1's output.
 *
 * Value lists exist both as Kibana value lists (V1) and as lookup indices (POC).
 *
 * Usage: node poc_ab_compare.mjs   (add --clean to remove)
 */

const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const USER = process.env.ES_USER || 'elastic';
const PASS = process.env.ES_PASS || 'changeme';
const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
const SRC = 'poc_ab_src';
const PREVIEW_IDX = '.preview.alerts-security.alerts-default';
const kbnH = { Authorization: auth, 'Content-Type': 'application/json', 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' };
const esH = { Authorization: auth, 'Content-Type': 'application/json' };
const lookupIndex = (id) => `poc_vl_${id.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

async function j(url, opts, ignore = []) {
  const res = await fetch(url, opts);
  const t = await res.text();
  const body = t ? JSON.parse(t) : undefined;
  if (!res.ok && !ignore.includes(res.status)) throw new Error(`${opts.method} ${url} -> ${res.status}\n${t.slice(0, 400)}`);
  return { status: res.status, body };
}
const kbn = (p, m, b, ig) => j(`${KBN}${p}`, { method: m, headers: kbnH, body: b && JSON.stringify(b) }, ig);
const es = (p, m, b, ig) => j(`${ES}${p}`, { method: m, headers: esH, body: b && JSON.stringify(b) }, ig);
const ndjson = (idx, lines) => j(`${ES}/${idx}/_bulk?refresh=true`, { method: 'POST', headers: { ...esH, 'Content-Type': 'application/x-ndjson' }, body: lines.join('\n') + '\n' });

const VALUE_LISTS = {
  'poc-ab-vlkw': { vlType: 'keyword', values: ['listedkw'] },
  'poc-ab-vlip': { vlType: 'ip', values: ['10.20.20.20'] },
  'poc-ab-vlrange': { vlType: 'ip_range', ranges: [['10.30.0.0', '10.30.255.255']] },
};

// Each test: field, es mapping, optional mapping extras, exception entry, bad/good.
// bad => should be excluded; good => should survive (null good = field absent).
const M = (type, extra) => ({ type, ...extra });
const TESTS = [
  // operator coverage (keyword/text)
  { id: 'op_match_kw', field: 'f_kw', map: M('keyword'), entry: { type: 'match', value: 'evil' }, bad: 'evil', good: 'clean' },
  { id: 'op_matchany_kw', field: 'f_ma', map: M('keyword'), entry: { type: 'match_any', value: ['mal1', 'mal2'] }, bad: 'mal1', good: 'ok' },
  { id: 'op_exists_kw', field: 'f_ex', map: M('keyword'), entry: { type: 'exists' }, bad: 'present', good: null },
  { id: 'op_wildcard_kw', field: 'f_wc', map: M('keyword'), entry: { type: 'wildcard', value: 'danger*' }, bad: 'dangerous', good: 'safe' },
  { id: 'op_wildcard_txt', field: 'f_wctxt', map: M('text'), entry: { type: 'wildcard', value: 'danger*' }, bad: 'danger', good: 'safe' },
  // numeric family
  { id: 'ty_long', field: 'f_long', map: M('long'), entry: { type: 'match', value: '42' }, bad: 42, good: 7 },
  { id: 'ty_integer', field: 'f_int', map: M('integer'), entry: { type: 'match', value: '42' }, bad: 42, good: 7 },
  { id: 'ty_short', field: 'f_short', map: M('short'), entry: { type: 'match', value: '42' }, bad: 42, good: 7 },
  { id: 'ty_byte', field: 'f_byte', map: M('byte'), entry: { type: 'match', value: '42' }, bad: 42, good: 7 },
  { id: 'ty_double', field: 'f_double', map: M('double'), entry: { type: 'match', value: '3.14' }, bad: 3.14, good: 2.71 },
  { id: 'ty_float', field: 'f_float', map: M('float'), entry: { type: 'match', value: '3.5' }, bad: 3.5, good: 2.5 },
  { id: 'ty_half_float', field: 'f_hfloat', map: M('half_float'), entry: { type: 'match', value: '3.5' }, bad: 3.5, good: 2.5 },
  { id: 'ty_scaled_float', field: 'f_sfloat', map: M('scaled_float', { scaling_factor: 100 }), entry: { type: 'match', value: '3.5' }, bad: 3.5, good: 2.5 },
  { id: 'ty_unsigned_long', field: 'f_ulong', map: M('unsigned_long'), entry: { type: 'match', value: '1000000' }, bad: 1000000, good: 7 },
  // date family
  { id: 'ty_date', field: 'f_date', map: M('date'), entry: { type: 'match', value: '2025-01-01T00:00:00.000Z' }, bad: '2025-01-01T00:00:00.000Z', good: '2025-06-15T00:00:00.000Z' },
  { id: 'ty_date_nanos', field: 'f_datenanos', map: M('date_nanos'), entry: { type: 'match', value: '2025-01-01T00:00:00.000000000Z' }, bad: '2025-01-01T00:00:00.000000000Z', good: '2025-06-15T00:00:00.000000000Z' },
  // boolean
  { id: 'ty_boolean', field: 'f_bool', map: M('boolean'), entry: { type: 'match', value: 'true' }, bad: true, good: false },
  // string-like
  { id: 'ty_keyword', field: 'f_kw2', map: M('keyword'), entry: { type: 'match', value: 'evilkw' }, bad: 'evilkw', good: 'okkw' },
  { id: 'ty_text', field: 'f_txt', map: M('text'), entry: { type: 'match', value: 'malware' }, bad: 'malware', good: 'benign' },
  { id: 'ty_match_only_text', field: 'f_motext', map: M('match_only_text'), entry: { type: 'match', value: 'malware' }, bad: 'malware', good: 'benign' },
  { id: 'ty_wildcard_field', field: 'f_wcfield', map: M('wildcard'), entry: { type: 'match', value: 'evilwc' }, bad: 'evilwc', good: 'okwc' },
  { id: 'ty_version', field: 'f_ver', map: M('version'), entry: { type: 'match', value: '1.2.3' }, bad: '1.2.3', good: '2.0.0' },
  { id: 'ty_constant_keyword', field: 'f_cc', map: M('constant_keyword'), entry: { type: 'match', value: 'cval' }, bad: 'cval', good: null },
  // ip
  { id: 'ty_ip', field: 'f_ip', map: M('ip'), entry: { type: 'match', value: '10.10.10.10' }, bad: '10.10.10.10', good: '1.1.1.1' },
  // structured
  { id: 'ty_flattened_subkey', field: 'f_flat', subfield: 'f_flat.k', map: M('flattened'), entry: { type: 'match', value: 'evilflat' }, bad: { k: 'evilflat' }, good: { k: 'goodflat' } },
  // geo (non-functional as V1 exceptions; included to check V1==POC agreement)
  { id: 'ty_geo_point', field: 'f_geo', map: M('geo_point'), entry: { type: 'match', value: '1.0,2.0' }, bad: '1.0,2.0', good: '3.0,4.0' },
  { id: 'ty_geo_shape', field: 'f_geoshape', map: M('geo_shape'), entry: { type: 'match', value: 'POINT (1 1)' }, bad: 'POINT (1 1)', good: 'POINT (5 5)' },
  // value lists
  { id: 'vl_keyword', field: 'f_vlkw', map: M('keyword'), entry: { type: 'list', list: { id: 'poc-ab-vlkw', type: 'keyword' } }, bad: 'listedkw', good: 'unlistedkw' },
  { id: 'vl_ip', field: 'f_vlip', map: M('ip'), entry: { type: 'list', list: { id: 'poc-ab-vlip', type: 'ip' } }, bad: '10.20.20.20', good: '2.2.2.2' },
  { id: 'vl_ip_range', field: 'f_vlrange', map: M('ip'), entry: { type: 'list', list: { id: 'poc-ab-vlrange', type: 'ip_range' } }, bad: '10.30.5.5', good: '3.3.3.3' },
];

async function clean() {
  for (const t of TESTS) await kbn(`/api/exception_lists?list_id=abx-${t.id}&namespace_type=single`, 'DELETE', undefined, [404]);
  await kbn(`/api/detection_engine/rules?rule_id=poc-ab-v1`, 'DELETE', undefined, [404, 500]);
  await kbn(`/api/detection_engine/rules?rule_id=poc-ab-poc`, 'DELETE', undefined, [404, 500]);
  for (const id of Object.keys(VALUE_LISTS)) {
    await kbn(`/api/lists?id=${id}`, 'DELETE', undefined, [404, 409]);
    await es(`/${lookupIndex(id)}`, 'DELETE', undefined, [404]);
  }
  await es(`/${SRC}`, 'DELETE', undefined, [404]);
}

async function setup() {
  const props = { '@timestamp': { type: 'date' }, tcase: { type: 'keyword' }, doc_id: { type: 'keyword' }, label: { type: 'keyword' } };
  for (const t of TESTS) props[t.field] = t.map;
  await es(`/${SRC}`, 'PUT', { mappings: { properties: props } });

  const now = Date.now();
  const lines = [];
  let n = 0;
  for (const t of TESTS) {
    for (const label of ['bad', 'good']) {
      const val = t[label];
      const doc = { '@timestamp': new Date(now - n++ * 1000).toISOString(), tcase: t.id, doc_id: `${t.id}:${label}`, label };
      if (val !== null && val !== undefined) doc[t.field] = val;
      lines.push('{"index":{}}', JSON.stringify(doc));
    }
  }
  await ndjson(SRC, lines);

  await kbn('/api/lists/index', 'POST', undefined, [409]);
  for (const [id, def] of Object.entries(VALUE_LISTS)) {
    await kbn('/api/lists', 'POST', { id, name: id, description: 'ab', type: def.vlType }, [409]);
    const items = def.vlType === 'ip_range' ? def.ranges.map((r) => `${r[0]}-${r[1]}`) : def.values;
    for (const value of items) await kbn('/api/lists/items', 'POST', { list_id: id, value }, [409]);
    const idx = lookupIndex(id);
    if (def.vlType === 'ip_range') {
      await es(`/${idx}`, 'PUT', { settings: { index: { mode: 'lookup' } }, mappings: { properties: { vl_start: { type: 'ip' }, vl_end: { type: 'ip' }, vl_mark: { type: 'keyword' } } } });
      await ndjson(idx, def.ranges.flatMap((r) => ['{"index":{}}', JSON.stringify({ vl_start: r[0], vl_end: r[1], vl_mark: '1' })]));
    } else {
      await es(`/${idx}`, 'PUT', { settings: { index: { mode: 'lookup' } }, mappings: { properties: { vl_value: { type: def.vlType }, vl_mark: { type: 'keyword' } } } });
      await ndjson(idx, def.values.flatMap((v) => ['{"index":{}}', JSON.stringify({ vl_value: v, vl_mark: '1' })]));
    }
  }

  const exLists = {};
  for (const t of TESTS) {
    const { body } = await kbn('/api/exception_lists', 'POST', { list_id: `abx-${t.id}`, name: `abx-${t.id}`, description: 'ab', type: 'detection', namespace_type: 'single' });
    const field = t.subfield || t.field;
    await kbn('/api/exception_lists/items', 'POST', { list_id: `abx-${t.id}`, item_id: `abx-item-${t.id}`, name: t.id, description: 'ab', type: 'simple', namespace_type: 'single', entries: [{ field, operator: 'included', ...t.entry }] });
    exLists[t.id] = body;
  }
  return exLists;
}

async function preview(name, test, exList) {
  const { body } = await kbn('/api/detection_engine/rules/preview?enable_logged_requests=true', 'POST', {
    rule_id: `prev-${name}-${test.id}`, name, description: 'ab', type: 'esql', language: 'esql',
    query: `FROM ${SRC} METADATA _id | WHERE tcase == "${test.id}"`,
    risk_score: 21, severity: 'low', from: 'now-24h', interval: '1m',
    exceptions_list: [{ id: exList.id, list_id: exList.list_id, type: 'detection', namespace_type: 'single' }],
    invocationCount: 1, timeframeEnd: new Date().toISOString(),
  });
  const errors = (body?.logs || []).flatMap((l) => l.errors || []);
  await es(`/${PREVIEW_IDX}/_refresh`, 'POST', undefined, [404]);
  const survivors = {};
  if (body?.previewId) {
    const { body: sr } = await es(`/${PREVIEW_IDX}/_search?size=50`, 'POST', { query: { term: { 'kibana.alert.rule.uuid': body.previewId } }, _source: ['doc_id', 'label'] }, [404]);
    for (const h of sr?.hits?.hits || []) survivors[h._source.doc_id] = h._source.label;
  }
  return { survivors, errors };
}

const setEq = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

async function main() {
  if (process.argv.includes('--clean')) return clean().then(() => console.log('cleaned'));
  await clean();
  const exLists = await setup();
  console.log(`Setup done: ${TESTS.length} type tests.\n`);
  console.log('test'.padEnd(24), 'V1 survivors'.padEnd(18), 'POC survivors'.padEnd(18), 'verdict');
  console.log('-'.repeat(80));

  let identical = 0, diverge = 0, bothErr = 0;
  const problems = [];
  for (const t of TESTS) {
    const v1 = await preview('ABX v1', t, exLists[t.id]);
    const poc = await preview('POC EXCEPTIONS abx', t, exLists[t.id]);
    const v1s = Object.keys(v1.survivors).map((k) => k.split(':')[1]).sort();
    const pocs = Object.keys(poc.survivors).map((k) => k.split(':')[1]).sort();
    const same = setEq(v1s, pocs);
    const v1err = v1.errors.length > 0;
    const pocerr = poc.errors.length > 0;
    let verdict;
    if (v1err && pocerr) { verdict = 'BOTH-ERR'; bothErr++; } // non-functional in V1 too (parity)
    else if (v1err || pocerr || !same) { verdict = 'DIVERGE'; diverge++; problems.push({ t: t.id, v1: v1s, poc: pocs, v1err: v1.errors[0], pocerr: poc.errors[0] }); }
    else { verdict = 'IDENTICAL'; identical++; }
    console.log(t.id.padEnd(24), (v1s.join(',') + (v1err ? ' [ERR]' : '')).padEnd(18), (pocs.join(',') + (pocerr ? ' [ERR]' : '')).padEnd(18), verdict);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`IDENTICAL: ${identical}/${TESTS.length}   BOTH-ERR (broken in V1 too): ${bothErr}/${TESTS.length}   DIVERGE: ${diverge}/${TESTS.length}`);
  if (problems.length) {
    console.log('\nReal divergences (V1 is the baseline):');
    for (const p of problems) {
      console.log(`  ${p.t}: V1 survivors=[${p.v1}] POC survivors=[${p.poc}]`);
      if (p.v1err) console.log(`     V1 error : ${p.v1err.slice(0, 120)}`);
      if (p.pocerr) console.log(`     POC error: ${p.pocerr.slice(0, 120)}`);
    }
  }
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
