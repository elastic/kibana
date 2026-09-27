#!/usr/bin/env node
/*
 * POC: item CRUD by id on lookup lists, and import without a list_id.
 *
 * Lookup item ids are content addressed (a hash of the value), so:
 *   - create returns the hash id; GET /api/lists/items?id= resolves it across lookup lists
 *   - _find pages the per-list index, filters, and sorts by value
 *   - PUT/PATCH replace the value and return the new id; the old id is gone
 *   - DELETE by id removes the value
 *   - the same works for a range list (source docs) and triggers a coalesce rebuild
 *   - POST /api/lists/items/_import?type=ip without list_id creates a lookup list named after the file
 *
 * Requires xpack.lists.enableLookupIndices: true. Run: node poc_items_crud_test.mjs
 */

const KBN = process.env.KIBANA_URL ?? 'http://localhost:5601/kbn';
const ES = process.env.ES_URL ?? 'http://localhost:9200';
const AUTH = 'Basic ' + Buffer.from(process.env.AUTH ?? 'elastic:changeme').toString('base64');
const SPACE = 'default';

const LIST = 'poc-crud-ips';
const RANGE_LIST = 'poc-crud-ranges';
const IMPORT_FILE = 'poc-crud-import.txt';
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const results = [];
const check = (label, ok, extra = '') => {
  log(`  ${label}: ${ok ? 'PASS' : 'FAIL'} ${extra}`);
  results.push(ok);
};

const importValues = async (values, fileName, query) => {
  const form = new FormData();
  form.append('file', new Blob([values.join('\n') + '\n'], { type: 'text/plain' }), fileName);
  const res = await fetch(`${KBN}/api/lists/items/_import?${query}`, {
    method: 'POST',
    headers: { authorization: AUTH, 'kbn-xsrf': 'poc', 'elastic-api-version': '2023-10-31' },
    body: form,
  });
  const text = await res.text();
  try {
    return { status: res.status, json: JSON.parse(text) };
  } catch {
    return { status: res.status, json: { raw: text } };
  }
};
const coalesced = async (index) => {
  const r = await es('POST', `/${index}/_search`, {
    size: 100,
    query: { term: { kind: 'coalesced' } },
    _source: ['range_start', 'range_end'],
  });
  return (r.json.hits?.hits ?? [])
    .map((h) => `${h._source.range_start}-${h._source.range_end}`)
    .sort();
};
const waitFor = async (fn, expected, timeoutMs = 40000) => {
  const start = Date.now();
  for (;;) {
    const got = await fn();
    if (JSON.stringify(got) === JSON.stringify(expected)) return got;
    if (Date.now() - start > timeoutMs) return got;
    await sleep(1000);
  }
};

const GEO_LIST = 'poc-crud-geo';

const cleanup = async () => {
  for (const id of [LIST, RANGE_LIST, IMPORT_FILE, GEO_LIST])
    await kbn('DELETE', `/api/lists?id=${id}`);
};

const main = async () => {
  log('=== cleanup ===');
  await cleanup();
  await kbn('POST', '/api/lists/index');

  log('\n=== equality list: create items, get by id, find ===');
  const created = await kbn('POST', '/api/lists', {
    id: LIST,
    name: LIST,
    description: 'crud',
    type: 'ip',
  });
  if (created.status >= 400)
    throw new Error(`create failed: ${created.status} ${JSON.stringify(created.json)}`);
  const a = await kbn('POST', '/api/lists/items', { list_id: LIST, value: '10.1.1.1' });
  const b = await kbn('POST', '/api/lists/items', { list_id: LIST, value: '10.1.1.2' });
  const c = await kbn('POST', '/api/lists/items', { list_id: LIST, value: '192.168.5.5' });
  check(
    'create returns a content addressed id',
    a.status === 200 && /^[0-9a-f]{64}$/.test(a.json.id),
    a.json.id
  );
  const again = await kbn('POST', '/api/lists/items', { list_id: LIST, value: '10.1.1.1' });
  check('same value yields the same id', again.json.id === a.json.id);

  const got = await kbn('GET', `/api/lists/items?id=${a.json.id}`);
  check(
    'GET by id resolves list and value',
    got.status === 200 && got.json.list_id === LIST && got.json.value === '10.1.1.1',
    JSON.stringify(got.json)
  );
  const byValue = await kbn('GET', `/api/lists/items?list_id=${LIST}&value=10.1.1.2`);
  check(
    'GET by list_id + value works',
    byValue.status === 200 && Array.isArray(byValue.json) && byValue.json[0]?.id === b.json.id
  );
  const missing = await kbn('GET', `/api/lists/items?id=${'0'.repeat(64)}`);
  check('GET unknown id is 404', missing.status === 404);

  const page1 = await kbn(
    'GET',
    `/api/lists/items/_find?list_id=${LIST}&page=1&per_page=2&sort_field=value&sort_order=asc`
  );
  check(
    'find first page with total and a cursor',
    page1.json.total === 3 &&
      page1.json.data?.length === 2 &&
      typeof page1.json.cursor === 'string',
    JSON.stringify(page1.json.data?.map((d) => d.value))
  );
  const page2 = await kbn(
    'GET',
    `/api/lists/items/_find?list_id=${LIST}&page=2&per_page=2&sort_field=value&sort_order=asc&cursor=${encodeURIComponent(
      page1.json.cursor
    )}`
  );
  check(
    'find second page through the cursor holds the rest',
    page2.json.data?.length === 1,
    JSON.stringify(page2.json.data?.map((d) => d.value))
  );
  const page2NoCursor = await kbn(
    'GET',
    `/api/lists/items/_find?list_id=${LIST}&page=2&per_page=2&sort_field=value&sort_order=asc`
  );
  check(
    'find second page without a cursor walks from the top',
    JSON.stringify(page2NoCursor.json.data?.map((d) => d.value)) ===
      JSON.stringify(page2.json.data?.map((d) => d.value))
  );
  const page3 = await kbn(
    'GET',
    `/api/lists/items/_find?list_id=${LIST}&page=3&per_page=1&sort_field=value&sort_order=desc`
  );
  check(
    'find a deep single item page in descending order',
    page3.json.data?.length === 1 && page3.json.data[0].value === '10.1.1.1',
    JSON.stringify(page3.json.data?.map((d) => d.value))
  );
  const beyond = await kbn('GET', `/api/lists/items/_find?list_id=${LIST}&page=9&per_page=2`);
  check(
    'find a page beyond the end is empty with the total intact',
    beyond.json.data?.length === 0 && beyond.json.total === 3
  );
  const filtered = await kbn(
    'GET',
    `/api/lists/items/_find?list_id=${LIST}&page=1&per_page=10&filter=${encodeURIComponent(
      'value: 192.168.5.5'
    )}`
  );
  check(
    'find applies the KQL filter',
    filtered.json.total === 1 && filtered.json.data?.[0]?.value === '192.168.5.5',
    JSON.stringify(filtered.json)
  );

  // Items carry who wrote them and when. `10.1.1.1` was written first and again last, so
  // it is the oldest by created_at and the newest by updated_at, and the items table's
  // default sort (updated_at desc) puts it first.
  const byUpdated = await kbn(
    'GET',
    `/api/lists/items/_find?list_id=${LIST}&page=1&per_page=10&sort_field=updated_at&sort_order=desc`
  );
  check(
    'find sorts by updated_at desc, the re-written value first',
    byUpdated.json.data?.[0]?.value === '10.1.1.1',
    JSON.stringify(byUpdated.json.data?.map((d) => d.value))
  );
  const byCreated = await kbn(
    'GET',
    `/api/lists/items/_find?list_id=${LIST}&page=1&per_page=10&sort_field=created_at&sort_order=asc`
  );
  check(
    'find sorts by created_at asc, the first written value first',
    byCreated.json.data?.[0]?.value === '10.1.1.1' &&
      byCreated.json.data?.[2]?.value === '192.168.5.5',
    JSON.stringify(byCreated.json.data?.map((d) => d.value))
  );
  const stamped = byCreated.json.data?.[0];
  check(
    'items carry real creation and update stamps',
    stamped?.created_by === 'elastic' &&
      stamped?.updated_by === 'elastic' &&
      stamped?.created_at < stamped?.updated_at,
    JSON.stringify({ c: stamped?.created_at, u: stamped?.updated_at })
  );

  log('\n=== equality list: update, patch, delete by id ===');
  const updated = await kbn('PUT', '/api/lists/items', { id: a.json.id, value: '10.9.9.9' });
  check(
    'PUT replaces the value and returns the new id',
    updated.status === 200 && updated.json.value === '10.9.9.9' && updated.json.id !== a.json.id,
    JSON.stringify(updated.json)
  );
  const oldGone = await kbn('GET', `/api/lists/items?id=${a.json.id}`);
  check('old id no longer resolves', oldGone.status === 404);
  const patched = await kbn('PATCH', '/api/lists/items', {
    id: updated.json.id,
    value: '10.8.8.8',
  });
  check('PATCH replaces the value', patched.status === 200 && patched.json.value === '10.8.8.8');
  const deleted = await kbn('DELETE', `/api/lists/items?id=${patched.json.id}`);
  check(
    'DELETE by id returns the item',
    deleted.status === 200 && deleted.json.value === '10.8.8.8'
  );
  const afterDelete = await kbn('GET', `/api/lists/items/_find?list_id=${LIST}&page=1&per_page=10`);
  check(
    'deleted value is gone from find',
    afterDelete.json.total === 2 && !afterDelete.json.data.some((d) => d.value === '10.8.8.8')
  );
  const delTwice = await kbn('DELETE', `/api/lists/items?id=${patched.json.id}`);
  check('DELETE of a missing id is 404', delTwice.status === 404);

  log('\n=== range list: update by id re-coalesces ===');
  const rc = await kbn('POST', '/api/lists', {
    id: RANGE_LIST,
    name: RANGE_LIST,
    description: 'crud',
    type: 'ip_range',
  });
  if (rc.status >= 400)
    throw new Error(`create range failed: ${rc.status} ${JSON.stringify(rc.json)}`);
  const r1 = await kbn('POST', '/api/lists/items', {
    list_id: RANGE_LIST,
    value: '10.0.0.0-10.0.0.100',
  });
  await kbn('POST', '/api/lists/items', { list_id: RANGE_LIST, value: '10.0.0.50-10.0.0.200' });
  const rangeIndex = `.value-list-v2-${SPACE}-${RANGE_LIST}`;
  check('range source id is prefixed', /^src:[0-9a-f]{64}$/.test(r1.json.id), r1.json.id);
  let merged = await waitFor(() => coalesced(rangeIndex), ['10.0.0.0-10.0.0.200']);
  check(
    'two overlapping ranges coalesce to one',
    JSON.stringify(merged) === JSON.stringify(['10.0.0.0-10.0.0.200']),
    JSON.stringify(merged)
  );
  const rUpd = await kbn('PUT', '/api/lists/items', {
    id: r1.json.id,
    value: '10.0.1.0-10.0.1.10',
  });
  check(
    'range PUT returns the new source id',
    rUpd.status === 200 && rUpd.json.value === '10.0.1.0-10.0.1.10' && rUpd.json.id !== r1.json.id
  );
  merged = await waitFor(
    () => coalesced(rangeIndex),
    ['10.0.0.50-10.0.0.200', '10.0.1.0-10.0.1.10']
  );
  check(
    'coalesced set follows the edit',
    JSON.stringify(merged) === JSON.stringify(['10.0.0.50-10.0.0.200', '10.0.1.0-10.0.1.10']),
    JSON.stringify(merged)
  );
  const rFind = await kbn('GET', `/api/lists/items/_find?list_id=${RANGE_LIST}&page=1&per_page=10`);
  check(
    'range find lists authored sources only',
    rFind.json.total === 2 && rFind.json.data.every((d) => d.value.includes('-')),
    JSON.stringify(rFind.json.data?.map((d) => d.value))
  );
  // a range item id names a range string; deleting by id removes that document, it
  // does not search the range field for the string (which Elasticsearch would reject)
  const rDel = await kbn('DELETE', `/api/lists/items?id=${rUpd.json.id}`);
  check(
    'range DELETE by id returns the authored range',
    rDel.status === 200 && rDel.json.value === '10.0.1.0-10.0.1.10',
    JSON.stringify(rDel.json)
  );
  merged = await waitFor(() => coalesced(rangeIndex), ['10.0.0.50-10.0.0.200']);
  check(
    'coalesced set follows the delete by id',
    JSON.stringify(merged) === JSON.stringify(['10.0.0.50-10.0.0.200']),
    JSON.stringify(merged)
  );

  log('\n=== import without list_id ===');
  const imported = await importValues(['1.1.1.1', '2.2.2.2', '1.1.1.1'], IMPORT_FILE, 'type=ip');
  check(
    'import creates a lookup list named after the file',
    imported.status === 200 &&
      imported.json.id === IMPORT_FILE &&
      imported.json.storage?.type === 'lookup_index',
    JSON.stringify(imported.json.storage)
  );
  const importedFind = await kbn(
    'GET',
    `/api/lists/items/_find?list_id=${encodeURIComponent(IMPORT_FILE)}&page=1&per_page=10`
  );
  check(
    'imported values are deduplicated in the lookup index',
    importedFind.json.total === 2,
    JSON.stringify(importedFind.json.data?.map((d) => d.value))
  );
  const reimported = await importValues(['3.3.3.3'], IMPORT_FILE, 'type=ip');
  const afterReimport = await kbn(
    'GET',
    `/api/lists/items/_find?list_id=${encodeURIComponent(IMPORT_FILE)}&page=1&per_page=10`
  );
  check(
    're-import into the same file name appends to the same list',
    reimported.status === 200 && afterReimport.json.total === 3
  );

  log('\n=== range list: delete by value on both storages ===');
  // The current implementation means "delete the ranges that contain the value", but its
  // second step rebuilds the delete query from the range strings it found, and a `term`
  // on the range field rejects a CIDR, so the request returns 400 whenever a range
  // matches. The lookup list carries the intended meaning through and returns 200 with
  // the removed ranges. A range string is refused by Elasticsearch on both, and a value
  // no range contains is 404 on both.
  const twins = [
    { id: 'poc-crud-del-legacy', storage: 'legacy' },
    { id: 'poc-crud-del-lookup', storage: 'lookup' },
  ];
  const answers = {};
  for (const twin of twins) {
    await kbn('DELETE', `/api/lists?id=${twin.id}`);
    const body = { id: twin.id, type: 'ip_range', name: twin.id, description: twin.id };
    if (twin.storage === 'legacy') body.meta = { __forceLegacy: true };
    await kbn('POST', '/api/lists', body);
    for (const value of ['10.9.0.0/24', '10.9.0.128-10.9.1.255', '10.9.5.0/24']) {
      await kbn('POST', '/api/lists/items', { list_id: twin.id, value });
    }
    const byAddress = await kbn('DELETE', `/api/lists/items?list_id=${twin.id}&value=10.9.0.200`);
    const remaining = await kbn('GET', `/api/lists/items/_find?list_id=${twin.id}&page=1&per_page=10`);
    const byRangeString = await kbn('DELETE', `/api/lists/items?list_id=${twin.id}&value=${encodeURIComponent('10.9.5.0/24')}`);
    const missing = await kbn('DELETE', `/api/lists/items?list_id=${twin.id}&value=192.168.7.7`);
    answers[twin.storage] = {
      byAddress: { status: byAddress.status, removed: Array.isArray(byAddress.json) ? byAddress.json.length : 0 },
      byRangeString: byRangeString.status,
      missing: missing.status,
      remaining: (remaining.json?.data ?? []).map((d) => d.value).sort(),
    };
    await kbn('DELETE', `/api/lists?id=${twin.id}`);
  }
  log(`  legacy: ${JSON.stringify(answers.legacy)}`);
  log(`  lookup: ${JSON.stringify(answers.lookup)}`);
  check('the current implementation fails an address delete when a range contains it', answers.legacy.byAddress.status === 400 && answers.legacy.remaining.length === 3, JSON.stringify(answers.legacy.byAddress));
  check('the lookup list removes the two ranges containing the address', answers.lookup.byAddress.status === 200 && answers.lookup.byAddress.removed === 2, JSON.stringify(answers.lookup.byAddress));
  check('the range that did not contain it remains on the lookup list', answers.lookup.remaining.length === 1, JSON.stringify(answers.lookup.remaining));
  check('a range string gets the same rejection on both storages', answers.legacy.byRangeString >= 400 && answers.legacy.byRangeString === answers.lookup.byRangeString, `${answers.legacy.byRangeString} vs ${answers.lookup.byRangeString}`);
  check('a value in no range is 404 on both', answers.legacy.missing === 404 && answers.lookup.missing === 404, `${answers.legacy.missing} vs ${answers.lookup.missing}`);

  log('\n=== geo_point list: authored spelling survives find and export ===');
  // A `lat,lon` value is stored as an object by the shared serializer. Two spellings of
  // the same pair share one document, and reads render it back as `lat,lon`, as the
  // shared stream does, so export regenerates the input instead of `[object Object]`.
  const geoCreated = await kbn('POST', '/api/lists', {
    id: GEO_LIST,
    type: 'geo_point',
    name: GEO_LIST,
    description: GEO_LIST,
  });
  check(
    'geo_point lookup list created',
    geoCreated.status === 200 && geoCreated.json.storage?.type === 'lookup_index',
    JSON.stringify(geoCreated.json?.message ?? '')
  );
  const geoIds = [];
  for (const value of [' 41.12 , -71.34 ', '41.12,-71.34', 'POINT (-71.34 41.12)']) {
    const added = await kbn('POST', '/api/lists/items', { list_id: GEO_LIST, value });
    check(
      `geo item ${JSON.stringify(value)} accepted`,
      added.status === 200,
      JSON.stringify(added.json?.message ?? '')
    );
    geoIds.push(added.json?.id);
  }
  check(
    'two spellings of one lat,lon pair share one item id',
    geoIds[0] != null && geoIds[0] === geoIds[1] && geoIds[1] !== geoIds[2]
  );
  const geoFind = await kbn('GET', `/api/lists/items/_find?list_id=${GEO_LIST}&page=1&per_page=10`);
  const geoValues = (geoFind.json.data ?? []).map((d) => d.value).sort();
  check(
    'find renders geo values as lat,lon and WKT',
    JSON.stringify(geoValues) === JSON.stringify(['41.12,-71.34', 'POINT (-71.34 41.12)']),
    JSON.stringify(geoValues)
  );
  const geoById = await kbn('GET', `/api/lists/items?id=${geoIds[0]}`);
  check(
    'geo item read by id returns lat,lon',
    geoById.status === 200 && geoById.json.value === '41.12,-71.34',
    JSON.stringify(geoById.json?.value)
  );
  const geoExport = await fetch(`${KBN}/api/lists/items/_export?list_id=${GEO_LIST}`, {
    method: 'POST',
    headers: kh,
  });
  const geoExported = (await geoExport.text()).split('\n').filter(Boolean).sort();
  check(
    'export regenerates the geo input',
    geoExport.status === 200 &&
      JSON.stringify(geoExported) === JSON.stringify(['41.12,-71.34', 'POINT (-71.34 41.12)']),
    JSON.stringify(geoExported)
  );

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
