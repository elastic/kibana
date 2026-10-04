#!/usr/bin/env node
/*
 * POC: indicator match rules that read a value list as a threat index produce the same
 * alerts on both storages.
 *
 * Phase 1, twins: the same `ip` list on legacy and lookup storage, the same events, one
 * indicator match rule per storage with the mapping each storage needs (legacy: threat
 * index `.items-<space>` with a `list_id` filter, field `ip`; lookup: the list's concrete
 * index, field `value`). The alert sets must be equal.
 *
 * Phase 2, migration: a legacy list read by an indicator match rule is migrated (forced,
 * since the scan reports the rule). A rule pointed at the concrete index alerts on the same
 * events. A value added after the migration reaches the lookup rule only: the legacy rule
 * keeps matching the frozen copy in `.items`, which is the behavior the proposal documents.
 *
 * Requires xpack.lists.enableLookupIndices: true. Run: node poc_indicator_match_parity_test.mjs
 */

const KBN = process.env.KIBANA_URL ?? 'http://localhost:5601/kbn';
const ES = process.env.ES_URL ?? 'http://localhost:9200';
const AUTH = 'Basic ' + Buffer.from(process.env.AUTH ?? 'elastic:changeme').toString('base64');
const SPACE = 'default';
const ITEMS_INDEX = `.items-${SPACE}`;
const ALERTS_INDEX = `.alerts-security.alerts-${SPACE}`;

const P = 'poc-imp';
const SRC_INDEX = `${P}-src`;
const IN = '10.30.0.1'; // in every list
const ADDED = '10.30.0.2'; // added to the migrated list after migration
const OUT = '10.99.0.1'; // in no list
const concreteIndex = (listId) => `.value-list-v2-${SPACE}-${listId}`;

const TWINS = [{ storage: 'legacy' }, { storage: 'lookup' }];
const twinList = (c) => `${P}-${c.storage}`;
const twinRule = (c) => `${P}-${c.storage}-rule`;
const MIG_LIST = `${P}-mig`;
const MIG_LEGACY_RULE = `${P}-mig-legacy-rule`;
const MIG_CONCRETE_RULE = `${P}-mig-concrete-rule`;
// a lookup rule saved with the product's default threat query, which filters on @timestamp
const DEFAULT_QUERY_RULE = `${P}-default-query-rule`;
// the same, but reading the list through its alias under `.items*`
const ALIAS_QUERY_RULE = `${P}-alias-default-query-rule`;
const DEFAULT_THREAT_QUERY = '@timestamp >= "now-30d/d"';
const aliasOf = (listId) => `${ITEMS_INDEX}-${listId}`;

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
const es = async (method, path, body) => {
  const isNdjson = typeof body === 'string';
  const res = await fetch(`${ES}${path}`, {
    method,
    headers: {
      authorization: AUTH,
      'content-type': isNdjson ? 'application/x-ndjson' : 'application/json',
    },
    body: body == null ? undefined : isNdjson ? body : JSON.stringify(body),
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
const now = () => new Date().toISOString();

const cleanup = async () => {
  for (const ruleId of [
    ...TWINS.map(twinRule),
    MIG_LEGACY_RULE,
    MIG_CONCRETE_RULE,
    DEFAULT_QUERY_RULE,
    ALIAS_QUERY_RULE,
  ]) {
    await kbn('DELETE', `/api/detection_engine/rules?rule_id=${ruleId}`);
  }
  for (const listId of [...TWINS.map(twinList), MIG_LIST]) {
    await kbn('DELETE', `/api/lists?id=${listId}&deleteReferences=true`);
    await es('DELETE', `/${concreteIndex(listId)}`);
  }
  await es('DELETE', `/${SRC_INDEX}`);
  await es(
    'POST',
    `/${ALERTS_INDEX}/_delete_by_query?refresh=true&conflicts=proceed&ignore_unavailable=true`,
    {
      query: { prefix: { 'kibana.alert.rule.name': P } },
    }
  );
};

const writeEvents = async () => {
  const bulk =
    [IN, ADDED, OUT]
      .map(
        (ip) =>
          `${JSON.stringify({ index: {} })}\n${JSON.stringify({
            '@timestamp': now(),
            destination: { ip },
            host: { name: P },
          })}`
      )
      .join('\n') + '\n';
  await es('PUT', `/${SRC_INDEX}`, {
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        destination: { properties: { ip: { type: 'ip' } } },
        host: { properties: { name: { type: 'keyword' } } },
      },
    },
  });
  await es('POST', `/${SRC_INDEX}/_bulk?refresh=true`, bulk);
};

const createList = async (listId, storage, check) => {
  const body = { id: listId, type: 'ip', name: listId, description: listId };
  if (storage === 'legacy') body.meta = { __forceLegacy: true };
  const created = await kbn('POST', '/api/lists', body);
  if (created.status >= 400)
    throw new Error(`create list ${listId}: ${created.status} ${JSON.stringify(created.json)}`);
  const isLookup = created.json?.storage?.type === 'lookup_index';
  check(`${listId}: storage is ${storage}`, storage === 'lookup' ? isLookup : !isLookup);
  const item = await kbn('POST', '/api/lists/items', { list_id: listId, value: IN });
  if (item.status >= 400)
    throw new Error(`add item to ${listId}: ${item.status} ${JSON.stringify(item.json)}`);
};

// The threat side of an indicator match rule, per storage: the shared stream needs the
// list filter and maps the typed `ip` column; a lookup list is its own index with `value`.
const threatSide = (storage, listId) =>
  storage === 'legacy'
    ? {
        threat_index: [ITEMS_INDEX],
        threat_query: `list_id: "${listId}"`,
        threat_mapping: [{ entries: [{ field: 'destination.ip', type: 'mapping', value: 'ip' }] }],
      }
    : {
        threat_index: [concreteIndex(listId)],
        threat_query: '*:*',
        threat_mapping: [
          { entries: [{ field: 'destination.ip', type: 'mapping', value: 'value' }] },
        ],
      };

// The rule handle: its saved object id, its rule_id, and the lookup index it reads (if any).
const ruleHandle = (id, ruleId, storage, listId) => ({
  id,
  ruleId,
  lookupIndex: storage === 'lookup' ? concreteIndex(listId) : undefined,
});

const createRule = async (ruleId, storage, listId, overrides = {}) => {
  const rule = await kbn('POST', '/api/detection_engine/rules', {
    rule_id: ruleId,
    name: ruleId,
    description: ruleId,
    type: 'threat_match',
    enabled: true,
    risk_score: 1,
    severity: 'low',
    from: 'now-1h',
    interval: '1m',
    index: [SRC_INDEX],
    query: `host.name: "${P}"`,
    language: 'kuery',
    threat_language: 'kuery',
    ...threatSide(storage, listId),
    ...overrides,
  });
  if (rule.status >= 400)
    throw new Error(`create rule ${ruleId}: ${rule.status} ${JSON.stringify(rule.json)}`);
  return rule.json.id;
};

const waitForExecution = async (ruleId, since) => {
  for (let i = 0; i < 90; i++) {
    const r = await kbn('GET', `/api/detection_engine/rules?rule_id=${ruleId}`);
    const last = r.json?.execution_summary?.last_execution;
    if (last?.date != null && last.date > since && last.status !== 'running') return last;
    await sleep(2000);
  }
  return undefined;
};

const runAndCollect = async (rules, check) => {
  const since = now();
  await sleep(1000);
  for (const { id } of rules) await kbn('POST', `/internal/alerting/rule/${id}/_run_soon`);
  for (const { ruleId, lookupIndex } of rules) {
    const last = await waitForExecution(ruleId, since);
    check(
      `${ruleId}: executed (${last?.status ?? 'no execution'})`,
      last?.status === 'succeeded',
      last?.status === 'succeeded' ? '' : String(last?.message ?? '').slice(0, 200)
    );
    if (lookupIndex != null) {
      // A lookup index carries no @timestamp on purpose. The executor's threat index
      // timestamp check must skip it, so the run is not a partial failure.
      const mapping = await es('GET', `/${lookupIndex}/_mapping`);
      const properties = Object.values(mapping.json)[0]?.mappings?.properties ?? {};
      check(
        `${ruleId}: the lookup index has no @timestamp field`,
        properties['@timestamp'] == null
      );
      check(
        `${ruleId}: no partial failure about the timestamp field`,
        last?.status !== 'partial failure' &&
          !String(last?.message ?? '').includes('missing the timestamp field'),
        String(last?.message ?? '').slice(0, 160)
      );
    }
  }
  await sleep(3000);
  const alerts = {};
  for (const { ruleId } of rules) alerts[ruleId] = await alertsFor(ruleId);
  return alerts;
};

const alertsFor = async (name) => {
  const r = await es('POST', `/${ALERTS_INDEX}/_search?ignore_unavailable=true`, {
    _source: false,
    fields: ['destination.ip'],
    size: 100,
    query: { term: { 'kibana.alert.rule.name': name } },
  });
  return [...new Set((r.json.hits?.hits ?? []).map((h) => h.fields?.['destination.ip']?.[0]))]
    .filter(Boolean)
    .sort();
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const main = async () => {
  const results = [];
  const check = (label, ok, extra = '') => {
    log(`  ${label}: ${ok ? 'PASS' : 'FAIL'} ${extra}`);
    results.push(ok);
  };

  log('=== cleanup ===');
  await cleanup();

  log('\n=== phase 1: twins ===');
  await kbn('POST', '/api/lists/index');
  await writeEvents();
  const twinRules = [];
  for (const cell of TWINS) {
    await createList(twinList(cell), cell.storage, check);
    twinRules.push(
      ruleHandle(
        await createRule(twinRule(cell), cell.storage, twinList(cell)),
        twinRule(cell),
        cell.storage,
        twinList(cell)
      )
    );
  }
  const twinAlerts = await runAndCollect(twinRules, check);
  for (const cell of TWINS) {
    check(
      `${twinRule(cell)}: alerts ${JSON.stringify(
        twinAlerts[twinRule(cell)]
      )} match expected ["${IN}"]`,
      same(twinAlerts[twinRule(cell)], [IN])
    );
  }
  check(
    'lookup alerts equal legacy alerts',
    same(twinAlerts[twinRule(TWINS[1])], twinAlerts[twinRule(TWINS[0])])
  );

  log('\n=== phase 2: migration ===');
  await createList(MIG_LIST, 'legacy', check);
  const legacyRule = ruleHandle(
    await createRule(MIG_LEGACY_RULE, 'legacy', MIG_LIST),
    MIG_LEGACY_RULE,
    'legacy',
    MIG_LIST
  );
  await sleep(1500); // let the rule become searchable for the scan
  const blocked = await kbn('POST', '/internal/lists/_migrate', { id: MIG_LIST }, ih);
  check(
    'migration without force is blocked by the indicator match rule (409, referenced)',
    blocked.status === 409 && blocked.json?.attributes?.warningLevel === 'referenced'
  );
  const migrated = await kbn('POST', '/internal/lists/_migrate', { id: MIG_LIST, force: true }, ih);
  check(
    'forced migration copies the items',
    migrated.status === 200 && migrated.json?.migration?.itemsCopied === 1,
    JSON.stringify(migrated.json?.migration ?? migrated.json).slice(0, 200)
  );
  const concreteRule = ruleHandle(
    await createRule(MIG_CONCRETE_RULE, 'lookup', MIG_LIST),
    MIG_CONCRETE_RULE,
    'lookup',
    MIG_LIST
  );

  const afterMigration = await runAndCollect([legacyRule, concreteRule], check);
  check(
    `legacy rule after migration alerts ${JSON.stringify(
      afterMigration[MIG_LEGACY_RULE]
    )} (frozen copy still matches)`,
    same(afterMigration[MIG_LEGACY_RULE], [IN])
  );
  check(
    `concrete-index rule alerts ${JSON.stringify(
      afterMigration[MIG_CONCRETE_RULE]
    )} match the legacy rule`,
    same(afterMigration[MIG_CONCRETE_RULE], afterMigration[MIG_LEGACY_RULE])
  );

  log('\n=== phase 2b: an edit after migration reaches the lookup rule only ===');
  const added = await kbn('POST', '/api/lists/items', { list_id: MIG_LIST, value: ADDED });
  if (added.status >= 400)
    throw new Error(`add item after migration: ${added.status} ${JSON.stringify(added.json)}`);
  const itemsRows = await es('POST', `/${ITEMS_INDEX}/_count`, {
    query: { term: { list_id: MIG_LIST } },
  });
  check(
    'the write went to the lookup index, not to the frozen copy in .items',
    (itemsRows.json.count ?? 0) === 1
  );
  const afterEdit = await runAndCollect([legacyRule, concreteRule], check);
  check(
    `legacy rule still alerts only ${JSON.stringify([IN])} (reads the frozen copy)`,
    same(afterEdit[MIG_LEGACY_RULE], [IN])
  );
  check(
    `concrete-index rule now alerts ${JSON.stringify([IN, ADDED].sort())}`,
    same(afterEdit[MIG_CONCRETE_RULE], [IN, ADDED].sort())
  );

  log('\n=== phase 3: the default threat query on a lookup index is reported, not silent ===');
  // The rule form defaults the threat query to a filter on @timestamp. A lookup index has
  // no such field, so that query matches no indicator. The run must say so as a partial
  // failure rather than succeed with no alerts.
  const lookupTwin = TWINS.find((cell) => cell.storage === 'lookup');
  const defaultQueryRule = ruleHandle(
    await createRule(DEFAULT_QUERY_RULE, 'lookup', twinList(lookupTwin), {
      threat_query: DEFAULT_THREAT_QUERY,
    }),
    DEFAULT_QUERY_RULE,
    'lookup',
    twinList(lookupTwin)
  );
  const since3 = now();
  await sleep(1000);
  await kbn('POST', `/internal/alerting/rule/${defaultQueryRule.id}/_run_soon`);
  const last3 = await waitForExecution(DEFAULT_QUERY_RULE, since3);
  check(
    `${DEFAULT_QUERY_RULE}: run is a partial failure`,
    last3?.status === 'partial failure',
    String(last3?.status)
  );
  check(
    `${DEFAULT_QUERY_RULE}: the message names the timestamp filter and the lookup index`,
    String(last3?.message ?? '').includes('carries no timestamp field') &&
      String(last3?.message ?? '').includes(concreteIndex(twinList(lookupTwin))),
    String(last3?.message ?? '').slice(0, 200)
  );
  await sleep(3000);
  check(
    `${DEFAULT_QUERY_RULE}: no alerts, since the query matches no indicator`,
    same(await alertsFor(DEFAULT_QUERY_RULE), [])
  );

  // The same rule reading the list through its alias. The alias is the name under
  // `.items*` a rule can read with the roles it holds today, and field caps resolves it to
  // the concrete index, so the check must reach the same conclusion.
  const aliasRule = ruleHandle(
    await createRule(ALIAS_QUERY_RULE, 'lookup', twinList(lookupTwin), {
      threat_index: [aliasOf(twinList(lookupTwin))],
      threat_query: DEFAULT_THREAT_QUERY,
    }),
    ALIAS_QUERY_RULE,
    'lookup',
    twinList(lookupTwin)
  );
  const since3b = now();
  await sleep(1000);
  await kbn('POST', `/internal/alerting/rule/${aliasRule.id}/_run_soon`);
  const last3b = await waitForExecution(ALIAS_QUERY_RULE, since3b);
  check(
    `${ALIAS_QUERY_RULE}: run through the alias is a partial failure too`,
    last3b?.status === 'partial failure',
    String(last3b?.status)
  );
  check(
    `${ALIAS_QUERY_RULE}: the message names the concrete lookup index the alias resolves to`,
    String(last3b?.message ?? '').includes('carries no timestamp field') &&
      String(last3b?.message ?? '').includes(concreteIndex(twinList(lookupTwin))),
    String(last3b?.message ?? '').slice(0, 200)
  );

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
