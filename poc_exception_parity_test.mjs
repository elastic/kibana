#!/usr/bin/env node
/*
 * POC: exceptions that reference a value list behave the same on both storages.
 *
 * Matrix: list kind {ip, ip_range} x storage {legacy, lookup} x list size {small, large} x operator.
 *   - small: one item, so the executor inlines the list into the query (inline path)
 *   - large: more than 65,536 items, so the executor post-filters each page of events
 *     against the list (post-filter path); operator `included` only
 *   - `excluded` on the small ip lists only
 * Every cell gets its own ip list, exception container with one list entry on `source.ip`,
 * and query rule over the same three events. The alerts of a lookup cell must equal the
 * alerts of its legacy twin and the expected set.
 * Two extra small `ip` cells use a mixed case list id with a space in it. The lookup index
 * name is a normalized form of the id, so these cells check that the id itself stays as
 * authored (list read, item read by value, exception reference) while the storage locator
 * holds the normalized index and alias names.
 *
 * Requires xpack.lists.enableLookupIndices: true. Run: node poc_exception_parity_test.mjs
 */

const KBN = process.env.KIBANA_URL ?? 'http://localhost:5601/kbn';
const ES = process.env.ES_URL ?? 'http://localhost:9200';
const AUTH = 'Basic ' + Buffer.from(process.env.AUTH ?? 'elastic:changeme').toString('base64');
const SPACE = 'default';
const ITEMS_INDEX = `.items-${SPACE}`;
const ALERTS_INDEX = `.alerts-security.alerts-${SPACE}`;

const P = 'poc-parity';
const SRC_INDEX = `${P}-src`;
const IN_SMALL = '10.10.0.1'; // the only item of every small list
const IN_LARGE = '10.20.0.1'; // one item of every large list
const OUT = '10.99.0.1'; // in no list
const LARGE_COUNT = 70000; // above the 65,536 inline limit
const IMPORT_CHUNK = 35000; // one import caps at 65,536 lines

// `kind` is the list type: `ip` (equality) or `range` (an `ip_range` list). The small
// range list holds one block that contains IN_SMALL; the large one holds one /32 block per
// address of the large set, so it exceeds the inline limit and takes the post-filter path
// on both storages, as the ip lists do.
const CELLS = [
  { kind: 'ip', op: 'included', size: 'small', storage: 'legacy' },
  { kind: 'ip', op: 'included', size: 'small', storage: 'lookup' },
  { kind: 'ip', op: 'excluded', size: 'small', storage: 'legacy' },
  { kind: 'ip', op: 'excluded', size: 'small', storage: 'lookup' },
  { kind: 'ip', op: 'included', size: 'large', storage: 'legacy' },
  { kind: 'ip', op: 'included', size: 'large', storage: 'lookup' },
  { kind: 'range', op: 'included', size: 'small', storage: 'legacy' },
  { kind: 'range', op: 'included', size: 'small', storage: 'lookup' },
  { kind: 'range', op: 'included', size: 'large', storage: 'legacy' },
  { kind: 'range', op: 'included', size: 'large', storage: 'lookup' },
  { kind: 'ip', op: 'included', size: 'small', storage: 'legacy', idCase: 'mixed' },
  { kind: 'ip', op: 'included', size: 'small', storage: 'lookup', idCase: 'mixed' },
];
// rule, container, and list name; lowercase so the alert cleanup by prefix finds them
const nameOf = (c) =>
  `${P}-${c.kind}-${c.storage}-${c.size}-${c.op}${c.idCase === 'mixed' ? '-mixed' : ''}`;
// the list id: as the name, except the mixed case cells, whose id has capitals and a space
const listIdOf = (c) =>
  c.idCase === 'mixed' ? `Poc-Parity_${c.kind}_${c.storage}_MIXED Case` : nameOf(c);
// mirrors normalizeListId in services/lookup/get_lookup_index.ts
const normalizedIdOf = (id) =>
  id
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/^[-_+.]+/, '');
const lookupIndexOf = (id) => `.value-list-v2-${SPACE}-${normalizedIdOf(id)}`;
const lookupAliasOf = (id) => `${ITEMS_INDEX}-${normalizedIdOf(id)}`;
const expectedAlerts = ({ op, size }) => {
  if (op === 'excluded') return [IN_SMALL].sort(); // suppressed unless the value is in the list
  return (size === 'small' ? [IN_LARGE, OUT] : [IN_SMALL, OUT]).sort(); // suppressed when in the list
};
const SMALL_RANGE = '10.10.0.0/24'; // contains IN_SMALL
// one /32 per address of the large set, so the range list is large too and contains IN_LARGE
const largeRanges = () => largeValues().map((ip) => `${ip}/32`);

const kh = {
  authorization: AUTH,
  'content-type': 'application/json',
  'kbn-xsrf': 'poc',
  'x-elastic-internal-origin': 'poc',
  'elastic-api-version': '2023-10-31',
};
const kbn = async (method, path, body) => {
  const res = await fetch(`${KBN}${path}`, {
    method,
    headers: kh,
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
  // a string body is NDJSON (bulk); anything else is JSON
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

const importValues = async (listId, type, values) => {
  const fd = new FormData();
  fd.append('file', new Blob([values.join('\n') + '\n'], { type: 'text/plain' }), `${listId}.txt`);
  const res = await fetch(`${KBN}/api/lists/items/_import?list_id=${listId}&type=${type}`, {
    method: 'POST',
    headers: { authorization: AUTH, 'kbn-xsrf': 'poc', 'elastic-api-version': '2023-10-31' },
    body: fd,
  });
  if (res.status >= 400)
    throw new Error(`import into ${listId} failed: ${res.status} ${await res.text()}`);
};

const largeValues = () =>
  Array.from(
    { length: LARGE_COUNT },
    (_, i) => `10.${20 + Math.floor(i / 65536)}.${Math.floor(i / 256) % 256}.${i % 256}`
  );

const cleanup = async () => {
  // objects from an earlier naming of this script (no list kind in the name)
  for (const storage of ['legacy', 'lookup']) {
    for (const size of ['small', 'large']) {
      for (const op of ['included', 'excluded']) {
        const old = `${P}-${storage}-${size}-${op}`;
        await kbn('DELETE', `/api/detection_engine/rules?rule_id=${old}`);
        await kbn('DELETE', `/api/exception_lists?list_id=${old}&namespace_type=single`);
        await kbn('DELETE', `/api/lists?id=${old}&deleteReferences=true`);
        await es('DELETE', `/.value-list-v2-${SPACE}-${old}`);
      }
    }
  }
  for (const c of CELLS) {
    const name = nameOf(c);
    const listId = listIdOf(c);
    await kbn('DELETE', `/api/detection_engine/rules?rule_id=${name}`);
    await kbn('DELETE', `/api/exception_lists?list_id=${name}&namespace_type=single`);
    await kbn('DELETE', `/api/lists?id=${encodeURIComponent(listId)}&deleteReferences=true`);
    await es('DELETE', `/${lookupIndexOf(listId)}`);
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
    [IN_SMALL, IN_LARGE, OUT]
      .map(
        (ip) =>
          `${JSON.stringify({ index: {} })}\n${JSON.stringify({
            '@timestamp': now(),
            host: { name: P },
            source: { ip },
          })}`
      )
      .join('\n') + '\n';
  await es('PUT', `/${SRC_INDEX}`, {
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        host: { properties: { name: { type: 'keyword' } } },
        source: { properties: { ip: { type: 'ip' } } },
      },
    },
  });
  await es('POST', `/${SRC_INDEX}/_bulk?refresh=true`, bulk);
};

const itemCount = async (cell, listId) => {
  if (cell.storage === 'legacy') {
    const r = await es('POST', `/${ITEMS_INDEX}/_count`, { query: { term: { list_id: listId } } });
    return r.json.count ?? 0;
  }
  // a range lookup index also holds bookkeeping and coalesced documents; count the sources
  const body = cell.kind === 'range' ? { query: { term: { kind: 'source' } } } : undefined;
  const r = await es('POST', `/${lookupIndexOf(listId)}/_count?ignore_unavailable=true`, body);
  return r.json.count ?? 0;
};

// The mixed case cells: the id stays as authored everywhere the API returns it, the
// storage locator holds the normalized names, and a read by value through the authored
// id reaches the item. Only the lookup storage normalizes anything; the legacy twin
// checks the id round trip only.
const checkMixedCaseId = async (cell, created, check) => {
  const name = nameOf(cell);
  const listId = listIdOf(cell);
  check(
    `${name}: list id kept as authored on create ("${created.json?.id}")`,
    created.json?.id === listId
  );
  if (cell.storage === 'lookup') {
    const { index, alias } = created.json?.storage?.locator ?? {};
    check(
      `${name}: locator index is the normalized name (${index})`,
      index === lookupIndexOf(listId)
    );
    check(
      `${name}: locator alias is the normalized name (${alias})`,
      alias === lookupAliasOf(listId)
    );
    const exists = await es('HEAD', `/${lookupIndexOf(listId)}`);
    check(`${name}: normalized index exists`, exists.status === 200);
  }
  const read = await kbn('GET', `/api/lists?id=${encodeURIComponent(listId)}`);
  check(
    `${name}: list read by authored id`,
    read.status === 200 && read.json?.id === listId,
    `status=${read.status}`
  );
  const item = await kbn(
    'GET',
    `/api/lists/items?list_id=${encodeURIComponent(listId)}&value=${IN_SMALL}`
  );
  const found = Array.isArray(item.json) ? item.json[0] : item.json;
  check(
    `${name}: item read by value through authored id`,
    item.status === 200 && found?.value === IN_SMALL && found?.list_id === listId,
    `status=${item.status}`
  );
};

const createList = async (cell, check) => {
  const name = nameOf(cell);
  const listId = listIdOf(cell);
  const type = cell.kind === 'range' ? 'ip_range' : 'ip';
  const body = { id: listId, type, name, description: name };
  if (cell.storage === 'legacy') body.meta = { __forceLegacy: true };
  const created = await kbn('POST', '/api/lists', body);
  if (created.status >= 400)
    throw new Error(`create list ${listId}: ${created.status} ${JSON.stringify(created.json)}`);
  const isLookup = created.json?.storage?.type === 'lookup_index';
  check(`${name}: storage is ${cell.storage}`, cell.storage === 'lookup' ? isLookup : !isLookup);

  if (cell.size === 'small') {
    const value = cell.kind === 'range' ? SMALL_RANGE : IN_SMALL;
    const item = await kbn('POST', '/api/lists/items', { list_id: listId, value });
    if (item.status >= 400)
      throw new Error(`add item to ${listId}: ${item.status} ${JSON.stringify(item.json)}`);
    if (cell.idCase === 'mixed') await checkMixedCaseId(cell, created, check);
    return;
  }
  const values = cell.kind === 'range' ? largeRanges() : largeValues();
  for (let i = 0; i < values.length; i += IMPORT_CHUNK)
    await importValues(listId, type, values.slice(i, i + IMPORT_CHUNK));
  let count = 0;
  for (let i = 0; i < 90 && count < LARGE_COUNT; i++) {
    await sleep(2000);
    count = await itemCount(cell, listId);
  }
  check(
    `${name}: ${LARGE_COUNT} items imported (post-filter path)`,
    count === LARGE_COUNT,
    `count=${count}`
  );
};

const createExceptionAndRule = async (cell) => {
  const name = nameOf(cell);
  const container = await kbn('POST', '/api/exception_lists', {
    list_id: name,
    name,
    description: name,
    type: 'detection',
    namespace_type: 'single',
  });
  if (container.status >= 400)
    throw new Error(
      `create exception list ${name}: ${container.status} ${JSON.stringify(container.json)}`
    );
  const item = await kbn('POST', '/api/exception_lists/items', {
    list_id: name,
    name,
    description: name,
    type: 'simple',
    namespace_type: 'single',
    // the exception references the list id as authored, mixed case included
    entries: [
      {
        field: 'source.ip',
        type: 'list',
        operator: cell.op,
        list: { id: listIdOf(cell), type: cell.kind === 'range' ? 'ip_range' : 'ip' },
      },
    ],
  });
  if (item.status >= 400)
    throw new Error(`create exception item ${name}: ${item.status} ${JSON.stringify(item.json)}`);
  const rule = await kbn('POST', '/api/detection_engine/rules', {
    rule_id: name,
    name,
    description: name,
    type: 'query',
    enabled: true,
    risk_score: 1,
    severity: 'low',
    from: 'now-1h',
    interval: '1m',
    index: [SRC_INDEX],
    query: `host.name: "${P}"`,
    language: 'kuery',
    exceptions_list: [
      { id: container.json.id, list_id: name, type: 'detection', namespace_type: 'single' },
    ],
  });
  if (rule.status >= 400)
    throw new Error(`create rule ${name}: ${rule.status} ${JSON.stringify(rule.json)}`);
  return rule.json.id;
};

const waitForExecution = async (name, since) => {
  for (let i = 0; i < 90; i++) {
    const r = await kbn('GET', `/api/detection_engine/rules?rule_id=${name}`);
    const last = r.json?.execution_summary?.last_execution;
    if (last?.date != null && last.date > since && last.status !== 'running') return last;
    await sleep(2000);
  }
  return undefined;
};

const alertsFor = async (name) => {
  const r = await es('POST', `/${ALERTS_INDEX}/_search?ignore_unavailable=true`, {
    _source: false,
    fields: ['source.ip'],
    size: 100,
    query: { term: { 'kibana.alert.rule.name': name } },
  });
  return [...new Set((r.json.hits?.hits ?? []).map((h) => h.fields?.['source.ip']?.[0]))]
    .filter(Boolean)
    .sort();
};

const main = async () => {
  const results = [];
  const check = (label, ok, extra = '') => {
    log(`  ${label}: ${ok ? 'PASS' : 'FAIL'} ${extra}`);
    results.push(ok);
  };

  log('=== cleanup ===');
  await cleanup();

  log('\n=== setup: events, lists, exceptions, rules ===');
  await kbn('POST', '/api/lists/index');
  await writeEvents();
  for (const cell of CELLS) await createList(cell, check);
  const ruleIds = {};
  for (const cell of CELLS) ruleIds[nameOf(cell)] = await createExceptionAndRule(cell);
  log(`  ${CELLS.length} rules created`);

  log('\n=== run rules ===');
  const since = now();
  await sleep(1000);
  for (const id of Object.values(ruleIds))
    await kbn('POST', `/internal/alerting/rule/${id}/_run_soon`);
  const observed = {};
  for (const cell of CELLS) {
    const name = nameOf(cell);
    const last = await waitForExecution(name, since);
    check(
      `${name}: executed (${last?.status ?? 'no execution'})`,
      last?.status === 'succeeded',
      last?.status === 'succeeded' ? '' : String(last?.message ?? '').slice(0, 200)
    );
  }
  await sleep(3000); // let the alerts index refresh
  for (const cell of CELLS) {
    const name = nameOf(cell);
    observed[name] = await alertsFor(name);
    const expected = expectedAlerts(cell);
    check(
      `${name}: alerts ${JSON.stringify(observed[name])} match expected ${JSON.stringify(
        expected
      )}`,
      JSON.stringify(observed[name]) === JSON.stringify(expected)
    );
  }

  log('\n=== parity: lookup cell equals its legacy twin ===');
  for (const cell of CELLS.filter((c) => c.storage === 'lookup')) {
    const twin = nameOf({ ...cell, storage: 'legacy' });
    check(
      `${cell.kind}/${cell.size}/${cell.op}${
        cell.idCase === 'mixed' ? '/mixed case id' : ''
      }: lookup alerts equal legacy alerts`,
      JSON.stringify(observed[nameOf(cell)]) === JSON.stringify(observed[twin]),
      `${JSON.stringify(observed[nameOf(cell)])} vs ${JSON.stringify(observed[twin])}`
    );
  }

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
