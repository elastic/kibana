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
const EXC_LIST = 'poc-mig-exc';
const REJ_LIST = 'poc-mig-rejected';
const IM_RULE = 'poc-mig-im';
// a list read by an indicator match rule through the wildcard `.items-*` rather than the exact stream name
const WILD_LIST = 'poc-mig-wild';
const WILD_RULE = 'poc-mig-wild-im';
const EXC_RULE = 'poc-mig-exc-rule';
const EXC_CONTAINER = 'poc-mig-exc-container';
const MIG_INDEX = `.value-list-v2-${SPACE}-${MIG_LIST}`;

const kh = {
  authorization: AUTH,
  'content-type': 'application/json',
  'kbn-xsrf': 'poc',
  'x-elastic-internal-origin': 'poc',
  'elastic-api-version': '2023-10-31',
};
const ih = { ...kh, 'elastic-api-version': '1' }; // internal route version

const kbn = async (method, path, body, headers = kh) => {
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
const es = async (method, path, body) => {
  const res = await fetch(`${ES}${path}`, {
    method,
    headers: { authorization: AUTH, 'content-type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, json: text ? JSON.parse(text) : {} };
  } catch {
    return { status: res.status, json: { raw: text } };
  }
};
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const createLegacyList = async (id, value) => {
  await kbn('POST', '/api/lists', {
    id,
    type: 'ip',
    name: id,
    description: id,
    meta: { __forceLegacy: true },
  });
  await kbn('POST', '/api/lists/items', { list_id: id, value });
};

const createImRule = (ruleId, listId, threatIndex = [ITEMS_INDEX]) =>
  kbn('POST', '/api/detection_engine/rules', {
    rule_id: ruleId,
    name: ruleId,
    description: ruleId,
    type: 'threat_match',
    enabled: false,
    risk_score: 1,
    severity: 'low',
    from: 'now-1h',
    interval: '5m',
    index: ['nonexistent-*'],
    query: '*',
    language: 'kuery',
    threat_index: threatIndex,
    threat_query: `list_id: "${listId}"`,
    threat_language: 'kuery',
    threat_mapping: [{ entries: [{ field: 'destination.ip', type: 'mapping', value: 'ip' }] }],
  });

// A query rule with an exception item that references `listId`; its API key is the
// caller's (elastic, superuser), so it can read the alias the list will get.
const createExceptionRule = async (ruleId, listId) => {
  await kbn('POST', '/api/exception_lists', {
    list_id: EXC_CONTAINER,
    name: EXC_CONTAINER,
    description: EXC_CONTAINER,
    type: 'detection',
    namespace_type: 'single',
  });
  await kbn('POST', '/api/exception_lists/items', {
    list_id: EXC_CONTAINER,
    name: 'ip in list',
    description: 'ip in list',
    type: 'simple',
    namespace_type: 'single',
    entries: [
      { field: 'source.ip', type: 'list', operator: 'included', list: { id: listId, type: 'ip' } },
    ],
  });
  const container = await kbn(
    'GET',
    `/api/exception_lists?list_id=${EXC_CONTAINER}&namespace_type=single`
  );
  return kbn('POST', '/api/detection_engine/rules', {
    // enabled, so the rule holds an API key for the scan to check
    rule_id: ruleId,
    name: ruleId,
    description: ruleId,
    type: 'query',
    enabled: true,
    risk_score: 1,
    severity: 'low',
    from: 'now-1h',
    interval: '5m',
    index: ['nonexistent-*'],
    query: '*',
    language: 'kuery',
    exceptions_list: [
      {
        id: container.json.id,
        list_id: EXC_CONTAINER,
        type: 'detection',
        namespace_type: 'single',
      },
    ],
  });
};

const cleanup = async () => {
  await kbn('DELETE', `/api/detection_engine/rules?rule_id=${IM_RULE}`);
  await kbn('DELETE', `/api/detection_engine/rules?rule_id=${WILD_RULE}`);
  await kbn('DELETE', `/api/detection_engine/rules?rule_id=${EXC_RULE}`);
  await kbn('DELETE', `/api/exception_lists?list_id=${EXC_CONTAINER}&namespace_type=single`);
  for (const id of [MIG_LIST, MAYBE_LIST, EXC_LIST, REJ_LIST, WILD_LIST])
    await kbn('DELETE', `/api/lists?id=${id}&deleteReferences=true`);
  await es('DELETE', `/${MIG_INDEX}`);
  await es('DELETE', `/.value-list-v2-${SPACE}-${REJ_LIST}`);
  await es('DELETE', `/.value-list-v2-${SPACE}-${MAYBE_LIST}`);
  await es('DELETE', `/.value-list-v2-${SPACE}-${EXC_LIST}`);
};

const main = async () => {
  const results = [];
  const check = (label, ok, extra = '') => {
    log(`  ${label}: ${ok ? 'PASS' : 'FAIL'} ${extra}`);
    results.push(ok);
  };

  log('=== cleanup ===');
  await cleanup();

  log('\n=== setup ===');
  await kbn('POST', '/api/lists/index');
  await createLegacyList(MIG_LIST, '1.2.3.4');
  await createLegacyList(MAYBE_LIST, '9.9.9.9');
  const rule = await createImRule(IM_RULE, MIG_LIST);
  const ruleId = rule.json.id;
  if (rule.status >= 400)
    throw new Error(`create IM rule failed: ${rule.status} ${JSON.stringify(rule.json)}`);
  log(`  legacy lists + IM rule (${ruleId}) referencing ${MIG_LIST} created`);
  await sleep(1500); // let the rule saved object become searchable

  log('\n=== migrate the referenced list ===');
  const blocked = await kbn('POST', '/internal/lists/_migrate', { id: MIG_LIST }, ih);
  log(`  blocked response: ${JSON.stringify(blocked.json).slice(0, 300)}`);
  check(
    'migration without force is blocked with 409 by the referencing rule',
    blocked.status === 409 &&
      blocked.json?.attributes?.warningLevel === 'referenced' &&
      String(blocked.json?.message).includes(ruleId)
  );
  const stillLegacy = await kbn('GET', `/api/lists?id=${MIG_LIST}`);
  check('blocked migration changed nothing', stillLegacy.json?.storage == null);
  const mig = await kbn('POST', '/internal/lists/_migrate', { id: MIG_LIST, force: true }, ih);
  if (mig.status >= 400)
    throw new Error(`migrate failed: ${mig.status} ${JSON.stringify(mig.json)}`);
  log(`  response: ${JSON.stringify(mig.json)}`);
  check(
    'migrated (was legacy) and items copied',
    mig.json?.migration?.alreadyLookup === false && mig.json?.migration?.itemsCopied >= 1
  );
  check('warningLevel = referenced', mig.json?.warningLevel === 'referenced');
  check(
    'warning names the referencing rule id',
    typeof mig.json?.warning === 'string' && mig.json.warning.includes(ruleId)
  );

  log('\n=== verify migration was non-destructive + flipped storage ===');
  await sleep(600);
  const lookup = await es('POST', `/${MIG_INDEX}/_search`, {
    query: { term: { value: '1.2.3.4' } },
  });
  check('value copied into the lookup index', (lookup.json.hits?.total?.value ?? 0) >= 1);
  const items = await es('POST', `/${ITEMS_INDEX}/_count`, {
    query: { term: { list_id: MIG_LIST } },
  });
  check('.items rows still present (non-destructive)', (items.json.count ?? 0) >= 1);
  const listMeta = await kbn('GET', `/api/lists?id=${MIG_LIST}`);
  check(
    'storage descriptor flipped to lookup',
    listMeta.json?.storage?.type === 'lookup_index',
    JSON.stringify(listMeta.json?.storage ?? {})
  );

  log('\n=== migrate a non-referenced list (rule reads .items but for another list) ===');
  const migMaybe = await kbn('POST', '/internal/lists/_migrate', { id: MAYBE_LIST }, ih);
  log(`  response: ${JSON.stringify(migMaybe.json)}`);
  check(
    'a "maybe" finding warns but does not block (200 without force)',
    migMaybe.status === 200 && migMaybe.json?.warningLevel === 'maybe'
  );
  check(
    'the warning names the rule that reads .items',
    typeof migMaybe.json?.warning === 'string' && migMaybe.json.warning.includes(ruleId)
  );

  log('\n=== migrate a list referenced only through an exception (key can read the alias) ===');
  // Any IM rule reading `.items-default` is a `maybe` for every list; a `maybe` warns
  // and never blocks, so rules other scripts leave behind do not change the outcome.
  await kbn('DELETE', `/api/detection_engine/rules?rule_id=${IM_RULE}`);
  await createLegacyList(EXC_LIST, '8.8.8.8');
  const excRule = await createExceptionRule(EXC_RULE, EXC_LIST);
  if (excRule.status >= 400)
    throw new Error(
      `create exception rule failed: ${excRule.status} ${JSON.stringify(excRule.json)}`
    );
  await sleep(1500);
  const migExc = await kbn('POST', '/internal/lists/_migrate', { id: EXC_LIST }, ih);
  log(`  response: ${JSON.stringify(migExc.json).slice(0, 400)}`);
  const excReport = migExc.json?.referencingRules;
  check(
    'an exception rule whose key can read the alias does not block (200 without force)',
    migExc.status === 200
  );
  check(
    'the level is not referenced: exception rules do not set it',
    excReport?.level === 'none' || excReport?.level === 'maybe'
  );
  check(
    'the exception rule is reported with reason exception and canRead true',
    (excReport?.rules ?? []).some(
      (r) => r.id === excRule.json.id && r.reason === 'exception' && r.canRead === true
    )
  );

  log('\n=== a rule that reads the shared stream through the wildcard .items-* ===');
  // The pattern resolves to the stream, so the rule reads the list exactly as one that
  // names `.items-default`; the report must treat both the same.
  await createLegacyList(WILD_LIST, '6.6.6.6');
  const wildRule = await createImRule(WILD_RULE, WILD_LIST, ['.items-*']);
  if (wildRule.status >= 400) throw new Error(`create wildcard IM rule failed: ${wildRule.status} ${JSON.stringify(wildRule.json)}`);
  await sleep(1500);
  const wildDry = await kbn('POST', '/internal/lists/_migrate', { id: WILD_LIST, dryRun: true }, ih);
  const wildReported = (wildDry.json?.referencingRules?.rules ?? []).find((r) => r.id === wildRule.json.id);
  check('a wildcard threat index that names the list is reported as referenced and blocks', wildDry.json?.warningLevel === 'referenced' && wildReported?.reason === 'threat_index' && wildDry.json?.blocked === true, `${wildDry.json?.warningLevel} ${JSON.stringify(wildReported)}`);
  await kbn('DELETE', `/api/detection_engine/rules?rule_id=${WILD_RULE}`);

  log('\n=== migrate a list holding values the lookup grammar refuses ===');
  // Elasticsearch stores `1.9` on a long field as 1, so the legacy list accepts it; the
  // lookup grammar refuses a fraction on an integer type. Migration must list every such
  // value and block, and with force leave them out and report them.
  await kbn('POST', '/api/lists', {
    id: REJ_LIST,
    type: 'long',
    name: REJ_LIST,
    description: REJ_LIST,
    meta: { __forceLegacy: true },
  });
  for (const value of ['1.9', '5', '2.5'])
    await kbn('POST', '/api/lists/items', { list_id: REJ_LIST, value });
  const legacyCount = await es('POST', `/${ITEMS_INDEX}/_count`, {
    query: { term: { list_id: REJ_LIST } },
  });
  check(
    'legacy long list accepted the fractional values',
    legacyCount.json.count === 3,
    `count=${legacyCount.json.count}`
  );
  const sortedSample = (rejected) => (rejected?.sample ?? []).slice().sort();
  const rejDry = await kbn('POST', '/internal/lists/_migrate', { id: REJ_LIST, dryRun: true }, ih);
  check(
    'dry run reports the block with the rejected count and sample and changes nothing',
    rejDry.status === 200 &&
      rejDry.json?.dryRun === true &&
      rejDry.json?.blocked === true &&
      rejDry.json?.rejectedValues?.count === 2 &&
      JSON.stringify(sortedSample(rejDry.json?.rejectedValues)) === JSON.stringify(['1.9', '2.5']),
    `${rejDry.status} ${JSON.stringify(rejDry.json?.rejectedValues)} blocked=${
      rejDry.json?.blocked
    }`
  );
  const rejDryList = await kbn('GET', `/api/lists?id=${REJ_LIST}`);
  check('dry run left the list legacy', rejDryList.json?.storage == null);
  const rejBlocked = await kbn('POST', '/internal/lists/_migrate', { id: REJ_LIST }, ih);
  check(
    'migration without force is blocked with 409 and reports the rejected count and sample',
    rejBlocked.status === 409 &&
      rejBlocked.json?.attributes?.rejectedValues?.count === 2 &&
      JSON.stringify(sortedSample(rejBlocked.json?.attributes?.rejectedValues)) ===
        JSON.stringify(['1.9', '2.5']),
    `${rejBlocked.status} ${JSON.stringify(rejBlocked.json?.attributes?.rejectedValues)}`
  );
  check(
    'the message names the rejected values',
    String(rejBlocked.json?.message).includes('"1.9"') &&
      String(rejBlocked.json?.message).includes('"2.5"')
  );
  const rejStillLegacy = await kbn('GET', `/api/lists?id=${REJ_LIST}`);
  check('blocked migration left the list legacy', rejStillLegacy.json?.storage == null);
  const rejForced = await kbn(
    'POST',
    '/internal/lists/_migrate',
    { id: REJ_LIST, force: true },
    ih
  );
  log(`  response: ${JSON.stringify(rejForced.json?.migration)}`);
  check(
    'forced migration succeeds and reports the dropped count and sample',
    rejForced.status === 200 &&
      rejForced.json?.migration?.dropped?.count === 2 &&
      JSON.stringify(sortedSample(rejForced.json?.migration?.dropped)) ===
        JSON.stringify(['1.9', '2.5']) &&
      rejForced.json?.migration?.itemsCopied === 1,
    JSON.stringify(rejForced.json?.migration)
  );
  const rejFind = await kbn('GET', `/api/lists/items/_find?list_id=${REJ_LIST}&page=1&per_page=10`);
  check(
    'the lookup list holds only the accepted value',
    rejFind.json?.total === 1 && rejFind.json?.data?.[0]?.value === '5',
    JSON.stringify(rejFind.json?.data?.map((d) => d.value))
  );
  const rejLegacyAfter = await es('POST', `/${ITEMS_INDEX}/_count`, {
    query: { term: { list_id: REJ_LIST } },
  });
  check('legacy rows untouched by the forced migration', rejLegacyAfter.json.count === 3);

  log('\n=== summary ===');
  log(
    `  ${results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'} (${results.filter(Boolean).length}/${
      results.length
    })`
  );
  if (!results.every(Boolean)) process.exit(1);
};

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
