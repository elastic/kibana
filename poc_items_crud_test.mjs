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
const kh = { authorization: AUTH, 'content-type': 'application/json', 'kbn-xsrf': 'poc', 'x-elastic-internal-origin': 'poc', 'elastic-api-version': '2023-10-31' };

const kbn = async (method, path, body) => {
  const res = await fetch(`${KBN}${path}`, { method, headers: kh, body: body == null ? undefined : JSON.stringify(body) });
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const results = [];
const check = (label, ok, extra = '') => { log(`  ${label}: ${ok ? 'PASS' : 'FAIL'} ${extra}`); results.push(ok); };

const importValues = async (values, fileName, query) => {
  const form = new FormData();
  form.append('file', new Blob([values.join('\n') + '\n'], { type: 'text/plain' }), fileName);
  const res = await fetch(`${KBN}/api/lists/items/_import?${query}`, { method: 'POST', headers: { authorization: AUTH, 'kbn-xsrf': 'poc', 'elastic-api-version': '2023-10-31' }, body: form });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; } catch { return { status: res.status, json: { raw: text } }; }
};
const coalesced = async (index) => {
  const r = await es('POST', `/${index}/_search`, { size: 100, query: { term: { kind: 'coalesced' } }, _source: ['range_start', 'range_end'] });
  return (r.json.hits?.hits ?? []).map((h) => `${h._source.range_start}-${h._source.range_end}`).sort();
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

const cleanup = async () => {
  for (const id of [LIST, RANGE_LIST, IMPORT_FILE]) await kbn('DELETE', `/api/lists?id=${id}`);
};

const main = async () => {
  log('=== cleanup ===');
  await cleanup();
  await kbn('POST', '/api/lists/index');

  log('\n=== equality list: create items, get by id, find ===');
  const created = await kbn('POST', '/api/lists', { id: LIST, name: LIST, description: 'crud', type: 'ip' });
  if (created.status >= 400) throw new Error(`create failed: ${created.status} ${JSON.stringify(created.json)}`);
  const a = await kbn('POST', '/api/lists/items', { list_id: LIST, value: '10.1.1.1' });
  const b = await kbn('POST', '/api/lists/items', { list_id: LIST, value: '10.1.1.2' });
  const c = await kbn('POST', '/api/lists/items', { list_id: LIST, value: '192.168.5.5' });
  check('create returns a content addressed id', a.status === 200 && /^[0-9a-f]{64}$/.test(a.json.id), a.json.id);
  const again = await kbn('POST', '/api/lists/items', { list_id: LIST, value: '10.1.1.1' });
  check('same value yields the same id', again.json.id === a.json.id);

  const got = await kbn('GET', `/api/lists/items?id=${a.json.id}`);
  check('GET by id resolves list and value', got.status === 200 && got.json.list_id === LIST && got.json.value === '10.1.1.1', JSON.stringify(got.json));
  const byValue = await kbn('GET', `/api/lists/items?list_id=${LIST}&value=10.1.1.2`);
  check('GET by list_id + value works', byValue.status === 200 && Array.isArray(byValue.json) && byValue.json[0]?.id === b.json.id);
  const missing = await kbn('GET', `/api/lists/items?id=${'0'.repeat(64)}`);
  check('GET unknown id is 404', missing.status === 404);

  const page1 = await kbn('GET', `/api/lists/items/_find?list_id=${LIST}&page=1&per_page=2&sort_field=value&sort_order=asc`);
  check('find first page with total and a cursor', page1.json.total === 3 && page1.json.data?.length === 2 && typeof page1.json.cursor === 'string', JSON.stringify(page1.json.data?.map((d) => d.value)));
  const page2 = await kbn('GET', `/api/lists/items/_find?list_id=${LIST}&page=2&per_page=2&sort_field=value&sort_order=asc&cursor=${encodeURIComponent(page1.json.cursor)}`);
  check('find second page through the cursor holds the rest', page2.json.data?.length === 1, JSON.stringify(page2.json.data?.map((d) => d.value)));
  const page2NoCursor = await kbn('GET', `/api/lists/items/_find?list_id=${LIST}&page=2&per_page=2&sort_field=value&sort_order=asc`);
  check('find second page without a cursor walks from the top', JSON.stringify(page2NoCursor.json.data?.map((d) => d.value)) === JSON.stringify(page2.json.data?.map((d) => d.value)));
  const page3 = await kbn('GET', `/api/lists/items/_find?list_id=${LIST}&page=3&per_page=1&sort_field=value&sort_order=desc`);
  check('find a deep single item page in descending order', page3.json.data?.length === 1 && page3.json.data[0].value === '10.1.1.1', JSON.stringify(page3.json.data?.map((d) => d.value)));
  const beyond = await kbn('GET', `/api/lists/items/_find?list_id=${LIST}&page=9&per_page=2`);
  check('find a page beyond the end is empty with the total intact', beyond.json.data?.length === 0 && beyond.json.total === 3);
  const filtered = await kbn('GET', `/api/lists/items/_find?list_id=${LIST}&page=1&per_page=10&filter=${encodeURIComponent('value: 192.168.5.5')}`);
  check('find applies the KQL filter', filtered.json.total === 1 && filtered.json.data?.[0]?.value === '192.168.5.5', JSON.stringify(filtered.json));

  log('\n=== equality list: update, patch, delete by id ===');
  const updated = await kbn('PUT', '/api/lists/items', { id: a.json.id, value: '10.9.9.9' });
  check('PUT replaces the value and returns the new id', updated.status === 200 && updated.json.value === '10.9.9.9' && updated.json.id !== a.json.id, JSON.stringify(updated.json));
  const oldGone = await kbn('GET', `/api/lists/items?id=${a.json.id}`);
  check('old id no longer resolves', oldGone.status === 404);
  const patched = await kbn('PATCH', '/api/lists/items', { id: updated.json.id, value: '10.8.8.8' });
  check('PATCH replaces the value', patched.status === 200 && patched.json.value === '10.8.8.8');
  const deleted = await kbn('DELETE', `/api/lists/items?id=${patched.json.id}`);
  check('DELETE by id returns the item', deleted.status === 200 && deleted.json.value === '10.8.8.8');
  const afterDelete = await kbn('GET', `/api/lists/items/_find?list_id=${LIST}&page=1&per_page=10`);
  check('deleted value is gone from find', afterDelete.json.total === 2 && !afterDelete.json.data.some((d) => d.value === '10.8.8.8'));
  const delTwice = await kbn('DELETE', `/api/lists/items?id=${patched.json.id}`);
  check('DELETE of a missing id is 404', delTwice.status === 404);

  log('\n=== range list: update by id re-coalesces ===');
  const rc = await kbn('POST', '/api/lists', { id: RANGE_LIST, name: RANGE_LIST, description: 'crud', type: 'ip_range' });
  if (rc.status >= 400) throw new Error(`create range failed: ${rc.status} ${JSON.stringify(rc.json)}`);
  const r1 = await kbn('POST', '/api/lists/items', { list_id: RANGE_LIST, value: '10.0.0.0-10.0.0.100' });
  await kbn('POST', '/api/lists/items', { list_id: RANGE_LIST, value: '10.0.0.50-10.0.0.200' });
  const rangeIndex = `.value-list-v2-${SPACE}-${RANGE_LIST}`;
  check('range source id is prefixed', /^src:[0-9a-f]{64}$/.test(r1.json.id), r1.json.id);
  let merged = await waitFor(() => coalesced(rangeIndex), ['10.0.0.0-10.0.0.200']);
  check('two overlapping ranges coalesce to one', JSON.stringify(merged) === JSON.stringify(['10.0.0.0-10.0.0.200']), JSON.stringify(merged));
  const rUpd = await kbn('PUT', '/api/lists/items', { id: r1.json.id, value: '10.0.1.0-10.0.1.10' });
  check('range PUT returns the new source id', rUpd.status === 200 && rUpd.json.value === '10.0.1.0-10.0.1.10' && rUpd.json.id !== r1.json.id);
  merged = await waitFor(() => coalesced(rangeIndex), ['10.0.0.50-10.0.0.200', '10.0.1.0-10.0.1.10']);
  check('coalesced set follows the edit', JSON.stringify(merged) === JSON.stringify(['10.0.0.50-10.0.0.200', '10.0.1.0-10.0.1.10']), JSON.stringify(merged));
  const rFind = await kbn('GET', `/api/lists/items/_find?list_id=${RANGE_LIST}&page=1&per_page=10`);
  check('range find lists authored sources only', rFind.json.total === 2 && rFind.json.data.every((d) => d.value.includes('-')), JSON.stringify(rFind.json.data?.map((d) => d.value)));

  log('\n=== import without list_id ===');
  const imported = await importValues(['1.1.1.1', '2.2.2.2', '1.1.1.1'], IMPORT_FILE, 'type=ip');
  check('import creates a lookup list named after the file', imported.status === 200 && imported.json.id === IMPORT_FILE && imported.json.storage?.type === 'lookup_index', JSON.stringify(imported.json.storage));
  const importedFind = await kbn('GET', `/api/lists/items/_find?list_id=${encodeURIComponent(IMPORT_FILE)}&page=1&per_page=10`);
  check('imported values are deduplicated in the lookup index', importedFind.json.total === 2, JSON.stringify(importedFind.json.data?.map((d) => d.value)));
  const reimported = await importValues(['3.3.3.3'], IMPORT_FILE, 'type=ip');
  const afterReimport = await kbn('GET', `/api/lists/items/_find?list_id=${encodeURIComponent(IMPORT_FILE)}&page=1&per_page=10`);
  check('re-import into the same file name appends to the same list', reimported.status === 200 && afterReimport.json.total === 3);

  log('\n=== summary ===');
  log(`  ${results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'} (${results.filter(Boolean).length}/${results.length})`);
  await cleanup();
  if (!results.every(Boolean)) process.exit(1);
};

main().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
