#!/usr/bin/env node
/*
 * POC: migration endpoint (POST /internal/lists/_migrate) + referencing-rule warning ladder.
 *
 * Verifies:
 *   - a legacy list migrates to its own lookup index, non-destructively (the .items rows stay)
 *   - the storage descriptor flips to lookup
 *   - "referenced": an IM rule whose threat query names the migrated list_id -> its rule id is returned
 *   - "maybe": an IM rule reads .items but for a different list -> weaker warning
 *
 * Requires xpack.lists.enableLookupIndices: true. Run: node poc_migration_test.mjs
 */

const KBN = process.env.KIBANA_URL ?? 'http://localhost:5601/kbn';
const ES = process.env.ES_URL ?? 'http://localhost:9200';
const AUTH = 'Basic ' + Buffer.from(process.env.AUTH ?? 'elastic:changeme').toString('base64');
const SPACE = 'default';
const ITEMS_INDEX = `.items-${SPACE}`;

const MIG_LIST = 'poc-mig-list';
const MAYBE_LIST = 'poc-mig-maybe';
const IM_RULE = 'poc-mig-im';
const MIG_INDEX = `.value-list-${SPACE}-${MIG_LIST}`;

const kh = { authorization: AUTH, 'content-type': 'application/json', 'kbn-xsrf': 'poc', 'x-elastic-internal-origin': 'poc', 'elastic-api-version': '2023-10-31' };
const ih = { ...kh, 'elastic-api-version': '1' }; // internal route version

const kbn = async (method, path, body, headers = kh) => {
  const res = await fetch(`${KBN}${path}`, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: res.status, json };
};
const es = async (method, path, body) => {
  const res = await fetch(`${ES}${path}`, { method, headers: { authorization: AUTH, 'content-type': 'application/json' }, body: body == null ? undefined : JSON.stringify(body) });
  const text = await res.text();
  try { return { status: res.status, json: text ? JSON.parse(text) : {} }; } catch { return { status: res.status, json: { raw: text } }; }
};
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const createLegacyList = async (id, value) => {
  await kbn('POST', '/api/lists', { id, type: 'ip', name: id, description: id, meta: { __forceLegacy: true } });
  await kbn('POST', '/api/lists/items', { list_id: id, value });
};

const createImRule = (ruleId, listId) => kbn('POST', '/api/detection_engine/rules', {
  rule_id: ruleId, name: ruleId, description: ruleId, type: 'threat_match', enabled: false,
  risk_score: 1, severity: 'low', from: 'now-1h', interval: '5m',
  index: ['nonexistent-*'], query: '*', language: 'kuery',
  threat_index: [ITEMS_INDEX], threat_query: `list_id: "${listId}"`, threat_language: 'kuery',
  threat_mapping: [{ entries: [{ field: 'destination.ip', type: 'mapping', value: 'ip' }] }],
});

const cleanup = async () => {
  await kbn('DELETE', `/api/detection_engine/rules?rule_id=${IM_RULE}`);
  for (const id of [MIG_LIST, MAYBE_LIST]) await kbn('DELETE', `/api/lists?id=${id}&deleteReferences=true`);
  await es('DELETE', `/${MIG_INDEX}`);
  await es('DELETE', `/.value-list-${SPACE}-${MAYBE_LIST}`);
};

const main = async () => {
  const results = [];
  const check = (label, ok, extra = '') => { log(`  ${label}: ${ok ? 'PASS' : 'FAIL'} ${extra}`); results.push(ok); };

  log('=== cleanup ===');
  await cleanup();

  log('\n=== setup ===');
  await kbn('POST', '/api/lists/index');
  await createLegacyList(MIG_LIST, '1.2.3.4');
  await createLegacyList(MAYBE_LIST, '9.9.9.9');
  const rule = await createImRule(IM_RULE, MIG_LIST);
  const ruleId = rule.json.id;
  if (rule.status >= 400) throw new Error(`create IM rule failed: ${rule.status} ${JSON.stringify(rule.json)}`);
  log(`  legacy lists + IM rule (${ruleId}) referencing ${MIG_LIST} created`);
  await sleep(1500); // let the rule saved object become searchable

  log('\n=== migrate the referenced list ===');
  const mig = await kbn('POST', '/internal/lists/_migrate', { id: MIG_LIST }, ih);
  if (mig.status >= 400) throw new Error(`migrate failed: ${mig.status} ${JSON.stringify(mig.json)}`);
  log(`  response: ${JSON.stringify(mig.json)}`);
  check('migrated (was legacy) and items copied', mig.json?.migration?.alreadyLookup === false && mig.json?.migration?.itemsCopied >= 1);
  check('warningLevel = referenced', mig.json?.warningLevel === 'referenced');
  check('warning names the referencing rule id', typeof mig.json?.warning === 'string' && mig.json.warning.includes(ruleId));

  log('\n=== verify migration was non-destructive + flipped storage ===');
  await sleep(600);
  const lookup = await es('POST', `/${MIG_INDEX}/_search`, { query: { term: { value: '1.2.3.4' } } });
  check('value copied into the lookup index', (lookup.json.hits?.total?.value ?? 0) >= 1);
  const items = await es('POST', `/${ITEMS_INDEX}/_count`, { query: { term: { list_id: MIG_LIST } } });
  check('.items rows still present (non-destructive)', (items.json.count ?? 0) >= 1);
  const listMeta = await kbn('GET', `/api/lists?id=${MIG_LIST}`);
  check('storage descriptor flipped to lookup', listMeta.json?.meta?.__vlStorage?.type === 'lookup', JSON.stringify(listMeta.json?.meta ?? {}));

  log('\n=== migrate a non-referenced list (rule reads .items but for another list) ===');
  const migMaybe = await kbn('POST', '/internal/lists/_migrate', { id: MAYBE_LIST }, ih);
  log(`  response: ${JSON.stringify(migMaybe.json)}`);
  check('warningLevel = maybe', migMaybe.json?.warningLevel === 'maybe');

  log('\n=== summary ===');
  log(`  ${results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'} (${results.filter(Boolean).length}/${results.length})`);
  if (!results.every(Boolean)) process.exit(1);
};

main().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
