#!/usr/bin/env node
// Probe: run the rule preview with logged requests to capture the ES|QL query
// actually sent to Elasticsearch, proving native exception injection runs.
const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const USER = process.env.ES_USER || 'elastic';
const PASS = process.env.ES_PASS || 'changeme';
const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
const headers = { Authorization: auth, 'Content-Type': 'application/json', 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' };

const CASES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['list_ip_range_included', 'list_keyword_excluded', 'match_long_included', 'match_keyword_excluded', 'exists_keyword_excluded'];

async function kbn(path, method, body) {
  const res = await fetch(`${KBN}${path}`, { method, headers, body: body && JSON.stringify(body) });
  const t = await res.text();
  return { status: res.status, body: t ? JSON.parse(t) : undefined };
}

function extractEsql(obj, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (typeof obj.request === 'string' && obj.request.includes('FROM ')) out.push(obj.request);
  if (typeof obj.request_query === 'string') out.push(obj.request_query);
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && (v.includes('LOOKUP JOIN') || (v.includes('FROM ') && v.includes('WHERE')))) out.push(v);
    else if (typeof v === 'object') extractEsql(v, out);
  }
  return out;
}

for (const caseId of CASES) {
  const { body: found } = await kbn(`/api/exception_lists?list_id=poc-exc-${caseId}&namespace_type=single`, 'GET');
  if (!found?.id) {
    console.log(`\n### ${caseId}: exception list not found`);
    continue;
  }
  const previewBody = {
    rule_id: `preview-${caseId}`,
    name: `preview ${caseId}`,
    description: 'preview',
    type: 'esql',
    language: 'esql',
    query: `FROM poc_source METADATA _id | WHERE test_case == "${caseId}"`,
    risk_score: 21,
    severity: 'low',
    from: 'now-24h',
    interval: '5m',
    tags: ['poc:esql-native-exceptions'],
    exceptions_list: [{ id: found.id, list_id: found.list_id, type: 'detection', namespace_type: 'single' }],
    invocationCount: 1,
    timeframeEnd: new Date().toISOString(),
  };
  const { status, body } = await kbn(
    `/api/detection_engine/rules/preview?enable_logged_requests=true`,
    'POST',
    previewBody
  );
  const esqls = [...new Set(extractEsql(body))];
  const withJoin = esqls.filter((q) => q.includes('LOOKUP JOIN') || q.includes('WHERE NOT ('));
  console.log(`\n### ${caseId}  (preview http ${status})`);
  console.log(`   errors: ${JSON.stringify(body?.errors ?? body?.logs?.flatMap((l) => l.errors) ?? [])}`);
  const printable = (withJoin.length ? withJoin : esqls).slice(0, 3);
  if (!printable.length) {
    console.log('   no ES|QL request captured; raw log keys:', Object.keys(body || {}));
  }
  for (const q of printable) console.log('   ESQL> ' + q.replace(/\n/g, '\n         '));
}
