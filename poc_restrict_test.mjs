#!/usr/bin/env node
/*
 * POC: shared vs restricted lookup lists.
 *
 * Verifies:
 *   - a new lookup list gets a concrete `.value-list-v2-<space>-<id>` index and an
 *     `.items-<space>-<id>` alias, and the locator records both
 *   - a role that only grants the legacy `.items-*` wildcard reads the list through the alias
 *   - a colliding list id (case variant) is rejected with 409 instead of sharing the index
 *   - POST /internal/lists/_restrict with dryRun reports and changes nothing
 *   - restrict removes the alias and the locator alias; the wildcard role loses access;
 *     a role granting the concrete index keeps access; Kibana still reads the list
 *   - a caller who cannot read the concrete index is blocked (409) unless force
 *   - POST /internal/lists/_unrestrict restores the alias and wildcard access
 *
 * Requires xpack.lists.enableLookupIndices: true. Run: node poc_restrict_test.mjs
 */

const KBN = process.env.KIBANA_URL ?? 'http://localhost:5601/kbn';
const ES = process.env.ES_URL ?? 'http://localhost:9200';
const AUTH = 'Basic ' + Buffer.from(process.env.AUTH ?? 'elastic:changeme').toString('base64');
const SPACE = 'default';

const LIST = 'poc-restrict-list';
const COLLIDE = 'POC-Restrict-List';
const INDEX = `.value-list-v2-${SPACE}-${LIST}`;
const ALIAS = `.items-${SPACE}-${LIST}`;
const VALUE = '10.42.42.42';
const WILDCARD_ROLE = 'poc_vl_wildcard';
const CONCRETE_ROLE = 'poc_vl_concrete';
const WILDCARD_USER = 'poc_vl_wildcard_user';
const CONCRETE_USER = 'poc_vl_concrete_user';
// A rule author with Kibana `all` but only the legacy `.items-*` wildcard in Elasticsearch,
// so the API key of a rule they save cannot read the concrete index.
const AUTHOR_ROLE = 'poc_vl_author';
const AUTHOR_USER = 'poc_vl_author_user';
const EXC_LIST = 'poc-restrict-exc';
const RULE_NAME = 'POC restrict author rule';
const PASSWORD = 'changeme123';

const authorRole = (extraIndices = []) => ({
  applications: [{ application: 'kibana-.kibana', privileges: ['all'], resources: ['*'] }],
  indices: [
    {
      names: ['.lists-*', '.items-*', ...extraIndices],
      privileges: ['read', 'write', 'view_index_metadata'],
    },
    {
      names: ['poc-src', '.alerts-security.alerts-*', '.internal.alerts-*'],
      privileges: ['read', 'write', 'view_index_metadata', 'manage'],
    },
  ],
});

const kh = {
  authorization: AUTH,
  'content-type': 'application/json',
  'kbn-xsrf': 'poc',
  'x-elastic-internal-origin': 'poc',
  'elastic-api-version': '2023-10-31',
};
const ih = { ...kh, 'elastic-api-version': '1' };

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
const es = async (method, path, body, auth = AUTH) => {
  const res = await fetch(`${ES}${path}`, {
    method,
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, json: text ? JSON.parse(text) : {} };
  } catch {
    return { status: res.status, json: { raw: text } };
  }
};
const basic = (user) => 'Basic ' + Buffer.from(`${user}:${PASSWORD}`).toString('base64');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const results = [];
const check = (label, ok, extra = '') => {
  log(`  ${label}: ${ok ? 'PASS' : 'FAIL'} ${extra}`);
  results.push(ok);
};

const canCount = async (user, name) => {
  const r = await es('GET', `/${name}/_count`, undefined, basic(user));
  return r.status === 200 && (r.json.count ?? 0) >= 1;
};

const cleanup = async () => {
  const rules = await kbn(
    'GET',
    `/api/detection_engine/rules/_find?filter=${encodeURIComponent(
      `alert.attributes.name: "${RULE_NAME}"`
    )}`
  );
  for (const rule of rules.json?.data ?? [])
    await kbn('DELETE', `/api/detection_engine/rules?id=${rule.id}`);
  await kbn('DELETE', `/api/exception_lists?list_id=${EXC_LIST}&namespace_type=single`);
  await kbn('DELETE', `/api/lists?id=${LIST}`);
  await kbn('DELETE', `/api/lists?id=${COLLIDE}`);
  await es('DELETE', `/${INDEX}`);
  for (const u of [WILDCARD_USER, CONCRETE_USER, AUTHOR_USER])
    await es('DELETE', `/_security/user/${u}`);
  for (const r of [WILDCARD_ROLE, CONCRETE_ROLE, AUTHOR_ROLE])
    await es('DELETE', `/_security/role/${r}`);
};

const main = async () => {
  log('=== cleanup ===');
  await cleanup();

  log('\n=== setup ===');
  await kbn('POST', '/api/lists/index');
  // The wildcard role is what a predefined serverless role or a pattern-based custom role
  // holds today: the documented privileges on the wildcard names, plus Kibana access.
  await es('PUT', `/_security/role/${WILDCARD_ROLE}`, {
    applications: [{ application: 'kibana-.kibana', privileges: ['all'], resources: ['*'] }],
    indices: [
      {
        names: ['.lists-*', '.items-*'],
        privileges: ['manage', 'write', 'read', 'view_index_metadata'],
      },
    ],
  });
  await es('PUT', `/_security/role/${CONCRETE_ROLE}`, {
    indices: [{ names: ['.lists-*', INDEX], privileges: ['read', 'view_index_metadata'] }],
  });
  await es('PUT', `/_security/user/${WILDCARD_USER}`, {
    password: PASSWORD,
    roles: [WILDCARD_ROLE],
  });
  await es('PUT', `/_security/user/${CONCRETE_USER}`, {
    password: PASSWORD,
    roles: [CONCRETE_ROLE],
  });

  const created = await kbn('POST', '/api/lists', {
    id: LIST,
    name: LIST,
    description: 'restrict poc',
    type: 'ip',
  });
  if (created.status >= 400)
    throw new Error(`create failed: ${created.status} ${JSON.stringify(created.json)}`);
  check(
    'locator records concrete index and alias',
    created.json.storage?.locator?.index === INDEX &&
      created.json.storage?.locator?.alias === ALIAS,
    JSON.stringify(created.json.storage)
  );
  const added = await kbn('POST', '/api/lists/items', { list_id: LIST, value: VALUE });
  check('item added through Kibana', added.status === 200);

  const aliasInfo = await es('GET', `/_alias/${ALIAS}`);
  check('alias points at the concrete index', INDEX in (aliasInfo.json ?? {}));
  check('wildcard role reads the list through the alias', await canCount(WILDCARD_USER, ALIAS));
  check('wildcard role cannot see the concrete index', !(await canCount(WILDCARD_USER, INDEX)));

  log(
    '\n=== provisioning runs as the system user, so a wildcard role creates and deletes lists ==='
  );
  const wh = { ...kh, authorization: basic(WILDCARD_USER) };
  const ownList = `${LIST}-by-wildcard`;
  const ownCreate = await kbn(
    'POST',
    '/api/lists',
    { id: ownList, name: ownList, description: 'x', type: 'ip' },
    wh
  );
  check(
    'wildcard-role user creates a lookup list',
    ownCreate.status === 200 &&
      ownCreate.json.storage?.locator?.alias === `.items-${SPACE}-${ownList}`,
    `${ownCreate.status} ${JSON.stringify(ownCreate.json.message ?? ownCreate.json.storage)}`
  );
  const ownItem = await kbn(
    'POST',
    '/api/lists/items',
    { list_id: ownList, value: '10.55.55.55' },
    wh
  );
  check('wildcard-role user writes an item through the alias', ownItem.status === 200);
  const ownDelete = await kbn('DELETE', `/api/lists?id=${ownList}`, undefined, wh);
  check(
    'wildcard-role user deletes the list',
    ownDelete.status === 200 &&
      (await es('HEAD', `/.value-list-v2-${SPACE}-${ownList}`)).status === 404
  );

  log('\n=== collision ===');
  const collide = await kbn('POST', '/api/lists', {
    id: COLLIDE,
    name: 'collide',
    description: 'x',
    type: 'ip',
  });
  check(
    'case-variant id rejected with 409',
    collide.status === 409,
    `${collide.status} ${collide.json?.message ?? ''}`
  );
  const docs = await es('GET', `/${INDEX}/_count`);
  check('concrete index still holds only the original list', docs.json.count === 1);

  log('\n=== restrict: dry run ===');
  const dry = await kbn('POST', '/internal/lists/_restrict', { id: LIST, dryRun: true }, ih);
  log(`  response: ${JSON.stringify(dry.json)}`);
  check(
    'dry run returns 200 with access still shared',
    dry.status === 200 && dry.json.access === 'shared' && dry.json.changed === false
  );
  check('dry run reports caller can read the concrete index', dry.json.callerCanRead === true);
  check('dry run changed nothing (alias still there)', await canCount(WILDCARD_USER, ALIAS));

  log('\n=== restrict: a referencing rule whose API key cannot read the concrete index blocks ===');
  await es('PUT', `/_security/role/${AUTHOR_ROLE}`, authorRole());
  await es('PUT', `/_security/user/${AUTHOR_USER}`, { password: PASSWORD, roles: [AUTHOR_ROLE] });
  const ah = { ...kh, authorization: basic(AUTHOR_USER) };
  const exc = await kbn(
    'POST',
    '/api/exception_lists',
    {
      list_id: EXC_LIST,
      name: EXC_LIST,
      description: 'x',
      type: 'detection',
      namespace_type: 'single',
    },
    ah
  );
  if (exc.status >= 400)
    throw new Error(`author exception list failed: ${exc.status} ${JSON.stringify(exc.json)}`);
  const excItem = await kbn(
    'POST',
    '/api/exception_lists/items',
    {
      list_id: EXC_LIST,
      name: 'in list',
      description: 'x',
      type: 'simple',
      namespace_type: 'single',
      entries: [
        {
          field: 'destination.ip',
          type: 'list',
          operator: 'included',
          list: { id: LIST, type: 'ip' },
        },
      ],
    },
    ah
  );
  if (excItem.status >= 400)
    throw new Error(
      `author exception item failed: ${excItem.status} ${JSON.stringify(excItem.json)}`
    );
  const rule = await kbn(
    'POST',
    '/api/detection_engine/rules',
    {
      name: RULE_NAME,
      description: 'x',
      risk_score: 1,
      severity: 'low',
      type: 'query',
      query: '*:*',
      index: ['poc-src'],
      from: 'now-1h',
      interval: '1h',
      enabled: true,
      exceptions_list: [
        { id: exc.json.id, list_id: EXC_LIST, type: 'detection', namespace_type: 'single' },
      ],
    },
    ah
  );
  if (rule.status >= 400)
    throw new Error(`author rule failed: ${rule.status} ${JSON.stringify(rule.json)}`);
  await sleep(1500);

  const dryBlocked = await kbn('POST', '/internal/lists/_restrict', { id: LIST, dryRun: true }, ih);
  log(`  response: ${JSON.stringify(dryBlocked.json)}`);
  const entry = dryBlocked.json.referencingRules?.rules?.find((r) => r.id === rule.json.id);
  check(
    'dry run finds the author rule through its exception',
    entry?.reason === 'exception',
    JSON.stringify(entry)
  );
  check(
    'dry run reports the rule key cannot read the concrete index',
    entry?.canRead === false && entry?.apiKeyOwner === AUTHOR_USER
  );
  const blocked = await kbn('POST', '/internal/lists/_restrict', { id: LIST }, ih);
  check(
    'restrict without force is blocked with 409',
    blocked.status === 409 &&
      blocked.json.attributes?.access === 'shared' &&
      String(blocked.json.message).includes('blocked'),
    String(blocked.json.message).slice(0, 160)
  );
  check('blocked restrict changed nothing', await canCount(WILDCARD_USER, ALIAS));
  const forced = await kbn('POST', '/internal/lists/_restrict', { id: LIST, force: true }, ih);
  check(
    'force restricts anyway',
    forced.status === 200 && forced.json.access === 'restricted' && forced.json.changed === true
  );
  const backToShared = await kbn('POST', '/internal/lists/_unrestrict', { id: LIST }, ih);
  check(
    'unrestrict after the forced restrict',
    backToShared.status === 200 && backToShared.json.alias === ALIAS
  );

  log('\n=== remedy: grant the role, refresh the rule key, verify again ===');
  await es('PUT', `/_security/role/${AUTHOR_ROLE}`, authorRole([INDEX]));
  const staleDry = await kbn('POST', '/internal/lists/_restrict', { id: LIST, dryRun: true }, ih);
  const staleEntry = staleDry.json.referencingRules?.rules?.find((r) => r.id === rule.json.id);
  check('role grant alone does not change the key snapshot', staleEntry?.canRead === false);
  // Disabling and enabling keeps the key; saving the rule issues a new one.
  const saved = await kbn(
    'PATCH',
    '/api/detection_engine/rules',
    { id: rule.json.id, description: 'saved after role grant' },
    ah
  );
  check('author saves the rule', saved.status === 200, String(saved.status));
  await sleep(1500);
  const freshDry = await kbn('POST', '/internal/lists/_restrict', { id: LIST, dryRun: true }, ih);
  const freshEntry = freshDry.json.referencingRules?.rules?.find((r) => r.id === rule.json.id);
  check(
    'after saving the rule its key reads the concrete index',
    freshEntry?.canRead === true,
    JSON.stringify(freshEntry)
  );
  check(
    'dry run no longer reports a blocker',
    typeof freshDry.json.message === 'string' && !freshDry.json.message.includes('blocked')
  );

  log('\n=== restrict ===');
  const restricted = await kbn('POST', '/internal/lists/_restrict', { id: LIST }, ih);
  log(`  response: ${JSON.stringify(restricted.json)}`);
  check(
    'restrict returns 200 and access restricted',
    restricted.status === 200 &&
      restricted.json.access === 'restricted' &&
      restricted.json.changed === true
  );
  const afterMeta = await kbn('GET', `/api/lists?id=${LIST}`);
  check(
    'locator dropped the alias',
    afterMeta.json.storage?.locator?.alias == null &&
      afterMeta.json.storage?.locator?.index === INDEX,
    JSON.stringify(afterMeta.json.storage)
  );
  check('alias removed in Elasticsearch', (await es('HEAD', `/_alias/${ALIAS}`)).status === 404);
  check(
    'wildcard role lost access',
    !(await canCount(WILDCARD_USER, ALIAS)) && !(await canCount(WILDCARD_USER, INDEX))
  );
  check('concrete role keeps access', await canCount(CONCRETE_USER, INDEX));
  const exported = await fetch(`${KBN}/api/lists/items/_export?list_id=${LIST}`, {
    method: 'POST',
    headers: kh,
  }).then((r) => r.text());
  check('Kibana still reads the list (export)', exported.includes(VALUE));
  const again = await kbn('POST', '/internal/lists/_restrict', { id: LIST }, ih);
  check('restrict is idempotent', again.status === 200 && again.json.changed === false);

  log('\n=== a writer without read on the restricted index can neither open nor delete it ===');
  // Restricting is an Elasticsearch boundary; the two operations that undo it must not be
  // open to every list writer. The wildcard-role user has Kibana `all` and the `.items*`
  // wildcard, and nothing on the concrete index.
  const wih = { ...ih, authorization: basic(WILDCARD_USER) };
  const deniedUnrestrict = await kbn('POST', '/internal/lists/_unrestrict', { id: LIST }, wih);
  check('wildcard-role user cannot un-restrict (403)', deniedUnrestrict.status === 403, `${deniedUnrestrict.status} ${JSON.stringify(deniedUnrestrict.json).slice(0, 120)}`);
  const deniedDelete = await kbn('DELETE', `/api/lists?id=${LIST}`, undefined, wh);
  check('wildcard-role user cannot delete the restricted list (403)', deniedDelete.status === 403, `${deniedDelete.status}`);
  check('the list and its index are still there', (await kbn('GET', `/api/lists?id=${LIST}`)).status === 200 && (await es('HEAD', `/${INDEX}`)).status === 200);
  check('the alias is still absent', (await es('HEAD', `/_alias/${ALIAS}`)).status === 404);

  log('\n=== unrestrict ===');
  const un = await kbn('POST', '/internal/lists/_unrestrict', { id: LIST }, ih);
  log(`  response: ${JSON.stringify(un.json)}`);
  check(
    'unrestrict returns 200 with the alias',
    un.status === 200 && un.json.alias === ALIAS && un.json.changed === true
  );
  check('wildcard role reads again through the alias', await canCount(WILDCARD_USER, ALIAS));
  const finalMeta = await kbn('GET', `/api/lists?id=${LIST}`);
  check('locator records the alias again', finalMeta.json.storage?.locator?.alias === ALIAS);

  log('\n=== summary ===');
  log(
    `  ${results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'} (${results.filter(Boolean).length}/${
      results.length
    })`
  );
  await cleanup();
  if (!results.every(Boolean)) process.exit(1);
};

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
