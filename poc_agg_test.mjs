#!/usr/bin/env node
/*
 * POC: native ES|QL exceptions on an AGGREGATING rule.
 *
 * Builds an aggregating rule (STATS grant_count = COUNT(*) BY app_id) and applies
 * exceptions that reference the OUTPUT columns (the group key `app_id` and the
 * aggregate `grant_count`), plus a value list on `app_id`. It also adds two
 * exceptions that CANNOT be inlined (a source-only field not in the output, and a
 * nested entry) to confirm they are reported and skipped.
 *
 * Verifies via the rule preview (logged requests) that the exception stages are
 * injected AFTER the STATS, and reports the generated query + skipped items +
 * surviving alert groups.
 *
 * Usage: node poc_agg_test.mjs   (add --clean to remove)
 */

const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const USER = process.env.ES_USER || 'elastic';
const PASS = process.env.ES_PASS || 'changeme';
const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
const POC_TAG = 'poc:esql-native-exceptions';
const SRC = 'poc_agg_src';
const VL_ID = 'poc-agg-vl';
const lookupIndex = (id) => `poc_vl_${id.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

const kbnH = { Authorization: auth, 'Content-Type': 'application/json', 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' };
const esH = { Authorization: auth, 'Content-Type': 'application/json' };

async function j(url, opts, ignore = []) {
  const res = await fetch(url, opts);
  const t = await res.text();
  const body = t ? JSON.parse(t) : undefined;
  if (!res.ok && !ignore.includes(res.status)) throw new Error(`${opts.method} ${url} -> ${res.status}\n${t.slice(0, 600)}`);
  return { status: res.status, body };
}
const kbn = (p, method, body, ignore) => j(`${KBN}${p}`, { method, headers: kbnH, body: body && JSON.stringify(body) }, ignore);
const es = (p, method, body, ignore) => j(`${ES}${p}`, { method, headers: esH, body: body && JSON.stringify(body) }, ignore);

// Grants per app_id. Threshold is >= 3, so low-1 (1) never alerts.
const APPS = {
  'malicious-1': 5,
  'malicious-2': 4,
  'trusted-a': 5, // whitelisted by match
  'trusted-b': 4, // whitelisted by match_any
  'trusted-c': 3, // whitelisted by match_any
  'trusted-d': 6, // whitelisted by value list
  'low-1': 1, // below threshold
};

async function clean() {
  await kbn(`/api/detection_engine/rules?rule_id=poc-agg-rule`, 'DELETE', undefined, [404, 500]);
  await kbn(`/api/exception_lists?list_id=poc-agg-exc&namespace_type=single`, 'DELETE', undefined, [404]);
  await kbn(`/api/lists?id=${VL_ID}`, 'DELETE', undefined, [404, 409]);
  await es(`/${lookupIndex(VL_ID)}`, 'DELETE', undefined, [404]);
  await es(`/${SRC}`, 'DELETE', undefined, [404]);
}

async function setup() {
  await es(`/${SRC}`, 'PUT', {
    mappings: { properties: { '@timestamp': { type: 'date' }, app_id: { type: 'keyword' }, user: { type: 'keyword' }, outcome: { type: 'keyword' } } },
  });
  const now = Date.now();
  const lines = [];
  let n = 0;
  for (const [app, count] of Object.entries(APPS)) {
    for (let i = 0; i < count; i++) {
      lines.push('{"index":{}}');
      lines.push(JSON.stringify({ '@timestamp': new Date(now - n++ * 1000).toISOString(), app_id: app, user: `u-${i}`, outcome: 'success' }));
    }
  }
  await j(`${ES}/${SRC}/_bulk?refresh=true`, { method: 'POST', headers: { ...esH, 'Content-Type': 'application/x-ndjson' }, body: lines.join('\n') + '\n' });

  // value list + lookup index (trusted-d)
  await kbn('/api/lists/index', 'POST', undefined, [409]);
  await kbn('/api/lists', 'POST', { id: VL_ID, name: 'agg vl', description: 'poc', type: 'keyword' }, [409]);
  await kbn('/api/lists/items', 'POST', { list_id: VL_ID, value: 'trusted-d' }, [409]);
  const idx = lookupIndex(VL_ID);
  await es(`/${idx}`, 'PUT', { settings: { index: { mode: 'lookup' } }, mappings: { properties: { vl_value: { type: 'keyword' }, vl_mark: { type: 'keyword' } } } });
  await j(`${ES}/${idx}/_bulk?refresh=true`, { method: 'POST', headers: { ...esH, 'Content-Type': 'application/x-ndjson' }, body: '{"index":{}}\n' + JSON.stringify({ vl_value: 'trusted-d', vl_mark: '1' }) + '\n' });

  // exception list + items
  const { body: exList } = await kbn('/api/exception_lists', 'POST', { list_id: 'poc-agg-exc', name: 'agg exc', description: 'poc', type: 'detection', namespace_type: 'single' });
  const items = [
    { item_id: 'i-match-groupkey', entries: [{ field: 'app_id', operator: 'included', type: 'match', value: 'trusted-a' }] },
    { item_id: 'i-matchany-groupkey', entries: [{ field: 'app_id', operator: 'included', type: 'match_any', value: ['trusted-b', 'trusted-c'] }] },
    { item_id: 'i-list-groupkey', entries: [{ field: 'app_id', operator: 'included', type: 'list', list: { id: VL_ID, type: 'keyword' } }] },
    { item_id: 'i-match-aggregate', entries: [{ field: 'grant_count', operator: 'included', type: 'match', value: '99' }] }, // numeric computed col; matches nothing
    { item_id: 'i-source-only-field', entries: [{ field: 'user', operator: 'included', type: 'match', value: 'u-0' }] }, // NOT in output -> skipped
    { item_id: 'i-nested', entries: [{ field: 'threat', type: 'nested', entries: [{ field: 'x', operator: 'included', type: 'match', value: 'y' }] }] }, // nested -> skipped
  ];
  for (const it of items) {
    await kbn('/api/exception_lists/items', 'POST', { list_id: 'poc-agg-exc', name: it.item_id, description: 'poc', type: 'simple', namespace_type: 'single', ...it }, [400, 409]).catch((e) => console.log('  (item create issue)', it.item_id, String(e).slice(0, 120)));
  }
  return exList;
}

const RULE_QUERY = `FROM ${SRC} | STATS grant_count = COUNT(*) BY app_id | WHERE grant_count >= 3`;

async function createRule(exList) {
  await kbn('/api/detection_engine/rules', 'POST', {
    rule_id: 'poc-agg-rule',
    name: 'POC agg exceptions',
    description: 'aggregating rule with native exceptions',
    type: 'esql',
    language: 'esql',
    query: RULE_QUERY,
    risk_score: 21,
    severity: 'low',
    from: 'now-24h',
    interval: '5m',
    enabled: true,
    tags: [POC_TAG],
    exceptions_list: [{ id: exList.id, list_id: exList.list_id, type: 'detection', namespace_type: 'single' }],
  });
}

function extractEsql(obj, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && v.includes('STATS')) out.push(v);
    else if (typeof v === 'object') extractEsql(v, out);
  }
  return out;
}

async function preview(exList) {
  const { body } = await kbn('/api/detection_engine/rules/preview?enable_logged_requests=true', 'POST', {
    rule_id: 'preview-poc-agg',
    name: 'preview agg',
    description: 'preview',
    type: 'esql',
    language: 'esql',
    query: RULE_QUERY,
    risk_score: 21,
    severity: 'low',
    from: 'now-24h',
    interval: '5m',
    tags: [POC_TAG],
    exceptions_list: [{ id: exList.id, list_id: exList.list_id, type: 'detection', namespace_type: 'single' }],
    invocationCount: 1,
    timeframeEnd: new Date().toISOString(),
  });
  const esqls = [...new Set(extractEsql(body))];
  const warnings = (body?.logs || []).flatMap((l) => l.warnings || []);
  const errors = (body?.logs || []).flatMap((l) => l.errors || []);
  console.log('\n=== Generated ES|QL sent to Elasticsearch (from preview logged requests) ===');
  for (const q of esqls) console.log(q + '\n');
  console.log('=== Warnings (skipped / not-inlineable exceptions) ===');
  warnings.forEach((w) => console.log('  - ' + w));
  if (errors.length) console.log('=== Errors ===', errors);
  console.log('=== previewId:', body?.previewId);
  return body?.previewId;
}

async function checkPreviewAlerts(previewId) {
  if (!previewId) return;
  await new Promise((r) => setTimeout(r, 1500));
  const { body } = await es('/.preview.alerts-security.alerts-default/_search?size=100', 'POST', {
    query: { term: { 'kibana.alert.rule.uuid': previewId } },
    _source: ['app_id', 'grant_count'],
  });
  const apps = (body?.hits?.hits || []).map((h) => `${h._source.app_id}(${h._source.grant_count})`).sort();
  console.log('\n=== Preview alert groups (should be ONLY malicious-1, malicious-2) ===');
  console.log('  ', apps.length ? apps.join(', ') : '(none yet - preview alerts may lag)');
}

async function main() {
  if (process.argv.includes('--clean')) return clean().then(() => console.log('cleaned'));
  await clean();
  const exList = await setup();
  await createRule(exList);
  console.log(`Setup done. Rule query:\n  ${RULE_QUERY}`);
  console.log('Groups with grant_count>=3:', Object.entries(APPS).filter(([, c]) => c >= 3).map(([a]) => a).join(', '));
  console.log('Whitelisted: trusted-a (match), trusted-b/c (match_any), trusted-d (value list)');
  const previewId = await preview(exList);
  await checkPreviewAlerts(previewId);
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
