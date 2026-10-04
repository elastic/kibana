#!/usr/bin/env node
/*
 * POC: response times of the list and item endpoints, legacy storage against lookup
 * storage, on the same operations with the same parameters.
 *
 * For each storage and list kind (`ip`, `ip_range`) the script measures, through the
 * public API with default refresh:
 *   - list create and delete (N_LISTS lists, ip only): a lookup list creates an index
 *   - item create, one request at a time (N_ITEMS)
 *   - item get by value, find page, delete by value (N_READS each)
 *   - one import of IMPORT_LINES values: the time until the items are visible in the
 *     store (the legacy import answers before it writes, the lookup import after, so the
 *     request time alone does not compare)
 *   - a burst of BURST concurrent item creates: wall time
 *   - for a lookup range list, the time from the end of a write burst until the
 *     background task records the coalesced set clean (this cost is off the request path)
 * Range values are scattered /24 blocks that never merge, the worst case for the task.
 * Both storages use the same refresh policy (`wait_for`) on item writes. Latencies are
 * wall clock at the client, in milliseconds. Absolute numbers depend on the machine; the
 * ratios between storages are the result.
 *
 * Requires xpack.lists.enableLookupIndices: true. Run: node poc_performance_test.mjs
 * Env: N_ITEMS (200), N_READS (100), N_LISTS (30), IMPORT_LINES (10000), BURST (50)
 */

const KBN = process.env.KIBANA_URL ?? 'http://localhost:5601/kbn';
const ES = process.env.ES_URL ?? 'http://localhost:9200';
const AUTH = 'Basic ' + Buffer.from(process.env.AUTH ?? 'elastic:changeme').toString('base64');
const SPACE = 'default';
const ITEMS_INDEX = `.items-${SPACE}`;
const P = 'poc-perf';

const N_ITEMS = Number(process.env.N_ITEMS ?? 200);
const N_READS = Number(process.env.N_READS ?? 100);
const N_LISTS = Number(process.env.N_LISTS ?? 30);
const IMPORT_LINES = Number(process.env.IMPORT_LINES ?? 10000);
const BURST = Number(process.env.BURST ?? 50);

const kh = {
  authorization: AUTH,
  'content-type': 'application/json',
  'kbn-xsrf': 'poc',
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
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const timed = async (fn) => {
  const start = performance.now();
  const result = await fn();
  return { ms: performance.now() - start, result };
};
const stats = (samples) => {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const mean = sorted.reduce((a, b) => a + b, 0) / Math.max(sorted.length, 1);
  return {
    max: sorted[sorted.length - 1] ?? 0,
    mean,
    n: sorted.length,
    p50: at(0.5),
    p95: at(0.95),
  };
};
const fmt = (ms) =>
  ms == null ? '-' : ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(1)} ms`;

const ipValue = (i) => `10.${Math.floor(i / 65536) % 256}.${Math.floor(i / 256) % 256}.${i % 256}`;
// Every other /24, so no two ranges touch: the coalesced set holds one interval per range,
// the worst case for the background task rather than the best (contiguous blocks merge to one).
const rangeValue = (i) => `${ipValue(i * 512)}/24`;
const valueFor = (kind, i) => (kind === 'ip' ? ipValue(i) : rangeValue(i));
// Reads by value on a range list use an address inside the range: on both storages a
// CIDR string is not a valid query value for the range field (Elasticsearch rejects it).
const readValueFor = (kind, i) => (kind === 'ip' ? ipValue(i) : ipValue(i * 512 + 7));

const listBody = (id, kind, storage) => {
  const body = { id, type: kind === 'ip' ? 'ip' : 'ip_range', name: id, description: id };
  if (storage === 'legacy') body.meta = { __forceLegacy: true };
  return body;
};

const ensureOk = (label, r) => {
  if (r.status >= 400)
    throw new Error(`${label}: ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  return r;
};

const importValues = async (listId, type, values) => {
  const fd = new FormData();
  fd.append('file', new Blob([values.join('\n') + '\n'], { type: 'text/plain' }), `${listId}.txt`);
  const res = await fetch(`${KBN}/api/lists/items/_import?list_id=${listId}&type=${type}`, {
    method: 'POST',
    headers: { authorization: AUTH, 'kbn-xsrf': 'poc', 'elastic-api-version': '2023-10-31' },
    body: fd,
  });
  if (res.status >= 400)
    throw new Error(`import into ${listId}: ${res.status} ${await res.text()}`);
};

const countItems = async (storage, kind, listId) => {
  if (storage === 'legacy') {
    const r = await es('POST', `/${ITEMS_INDEX}/_count`, { query: { term: { list_id: listId } } });
    return r.json.count ?? 0;
  }
  const body = kind === 'range' ? { query: { term: { kind: 'source' } } } : undefined;
  const r = await es(
    'POST',
    `/.value-list-v2-${SPACE}-${listId}/_count?ignore_unavailable=true`,
    body
  );
  return r.json.count ?? 0;
};

const waitFor = async (predicate, timeoutMs, stepMs = 200) => {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (await predicate()) return performance.now() - start;
    await sleep(stepMs);
  }
  return undefined;
};

const coalescedClean = async (listId) => {
  const r = await es('GET', `/.value-list-v2-${SPACE}-${listId}/_doc/__state`);
  const s = r.json?._source;
  return s != null && s.status === 'clean' && s.coalesced_version === s.source_version;
};

const cleanup = async () => {
  const lists = await kbn('GET', `/api/lists/_find?per_page=1000&filter=name:${P}*`);
  for (const list of lists.json?.data ?? []) {
    if (String(list.id).startsWith(P))
      await kbn('DELETE', `/api/lists?id=${list.id}&deleteReferences=true`);
  }
  await es('DELETE', `/.value-list-v2-${SPACE}-${P}-*`);
};

const measureCell = async (storage, kind) => {
  const listId = `${P}-${kind}-${storage}`;
  const type = kind === 'ip' ? 'ip' : 'ip_range';
  const out = {};

  ensureOk('create list', await kbn('POST', '/api/lists', listBody(listId, kind, storage)));

  // item create, sequential
  const creates = [];
  for (let i = 0; i < N_ITEMS; i++) {
    const { ms, result } = await timed(() =>
      kbn('POST', '/api/lists/items', { list_id: listId, value: valueFor(kind, i) })
    );
    ensureOk('create item', result);
    creates.push(ms);
  }
  out['item create'] = stats(creates);
  if (storage === 'lookup' && kind === 'range') {
    out[`coalesced clean after ${N_ITEMS} sequential creates (from the last one)`] = {
      single: await waitFor(() => coalescedClean(listId), 120000),
    };
  }

  // reads
  const gets = [];
  for (let i = 0; i < N_READS; i++) {
    const { ms, result } = await timed(() =>
      kbn(
        'GET',
        `/api/lists/items?list_id=${listId}&value=${encodeURIComponent(
          readValueFor(kind, i % N_ITEMS)
        )}`
      )
    );
    ensureOk('get by value', result);
    gets.push(ms);
  }
  out['item get by value'] = stats(gets);

  const finds = [];
  for (let i = 0; i < Math.min(N_READS, 20); i++) {
    const { ms, result } = await timed(() =>
      kbn('GET', `/api/lists/items/_find?list_id=${listId}&page=1&per_page=100`)
    );
    ensureOk('find', result);
    finds.push(ms);
  }
  out['item find (page of 100)'] = stats(finds);

  // burst of concurrent creates (new values)
  const burst = await timed(() =>
    Promise.all(
      Array.from({ length: BURST }, (_, i) =>
        kbn('POST', '/api/lists/items', { list_id: listId, value: valueFor(kind, N_ITEMS + i) })
      )
    )
  );
  burst.result.forEach((r) => ensureOk('burst create', r));
  out[`burst of ${BURST} concurrent creates (wall)`] = { single: burst.ms };
  if (storage === 'lookup' && kind === 'range') {
    out[`coalesced clean after the burst (from its end)`] = {
      single: await waitFor(() => coalescedClean(listId), 120000),
    };
  }

  // deletes by value (ip lists only: on a range list the two storages delete different
  // things by value, the ranges containing an address versus the authored range string)
  if (kind === 'ip') {
    const deletes = [];
    for (let i = 0; i < N_READS; i++) {
      const { ms, result } = await timed(() =>
        kbn(
          'DELETE',
          `/api/lists/items?list_id=${listId}&value=${encodeURIComponent(valueFor(kind, i))}`
        )
      );
      ensureOk('delete by value', result);
      deletes.push(ms);
    }
    out['item delete by value'] = stats(deletes);
  }

  // import; refresh first so the baseline count includes the deletes above
  await es(
    'POST',
    storage === 'legacy'
      ? `/${ITEMS_INDEX}/_refresh`
      : `/.value-list-v2-${SPACE}-${listId}/_refresh`
  );
  const before = await countItems(storage, kind, listId);
  const values = Array.from({ length: IMPORT_LINES }, (_, i) => valueFor(kind, 1_000_000 + i));
  // the legacy import answers before it writes and the lookup import answers after, so
  // only the time until the items are visible in the store compares the two
  const imp = await timed(() => importValues(listId, type, values));
  const visible = await waitFor(
    async () => (await countItems(storage, kind, listId)) >= before + IMPORT_LINES,
    120000,
    250
  );
  out[`import ${IMPORT_LINES} lines (until visible in store)`] = {
    single: visible == null ? undefined : imp.ms + visible,
  };
  if (storage === 'lookup' && kind === 'range') {
    out['coalesced clean after import (from its end)'] = {
      single: await waitFor(() => coalescedClean(listId), 300000, 500),
    };
  }

  const del = await timed(() => kbn('DELETE', `/api/lists?id=${listId}&deleteReferences=true`));
  ensureOk('delete list', del.result);
  out['list delete (with items)'] = { single: del.ms };
  return out;
};

const measureListLifecycle = async (storage) => {
  const creates = [];
  const deletes = [];
  for (let i = 0; i < N_LISTS; i++) {
    const id = `${P}-lists-${storage}-${i}`;
    const c = await timed(() => kbn('POST', '/api/lists', listBody(id, 'ip', storage)));
    ensureOk('create list', c.result);
    creates.push(c.ms);
  }
  for (let i = 0; i < N_LISTS; i++) {
    const id = `${P}-lists-${storage}-${i}`;
    const d = await timed(() => kbn('DELETE', `/api/lists?id=${id}`));
    ensureOk('delete list', d.result);
    deletes.push(d.ms);
  }
  return { 'list create (empty)': stats(creates), 'list delete (empty)': stats(deletes) };
};

const row = (label, legacy, lookup) => {
  const cell = (s) =>
    s == null ? '-' : 'single' in s ? fmt(s.single) : `${fmt(s.p50)} / ${fmt(s.p95)}`;
  const ratio =
    legacy == null || lookup == null
      ? '-'
      : 'single' in legacy
      ? legacy.single && lookup.single
        ? `${(lookup.single / legacy.single).toFixed(2)}x`
        : '-'
      : `${(lookup.p50 / legacy.p50).toFixed(2)}x`;
  return `| ${label} | ${cell(legacy)} | ${cell(lookup)} | ${ratio} |`;
};

const main = async () => {
  log(`=== cleanup ===`);
  await cleanup();
  await kbn('POST', '/api/lists/index');
  log(
    `=== settings: N_ITEMS=${N_ITEMS} N_READS=${N_READS} N_LISTS=${N_LISTS} IMPORT_LINES=${IMPORT_LINES} BURST=${BURST} ===`
  );

  const results = {};
  for (const kind of ['ip', 'range']) {
    for (const storage of ['legacy', 'lookup']) {
      log(`\n--- ${kind} / ${storage} ---`);
      results[`${kind}/${storage}`] = await measureCell(storage, kind);
      log('  done');
    }
  }
  const lifecycle = {};
  for (const storage of ['legacy', 'lookup']) {
    log(`\n--- list lifecycle / ${storage} ---`);
    lifecycle[storage] = await measureListLifecycle(storage);
  }

  log(
    '\n## Results (p50 / p95 per request, or a single wall time; ratio = lookup / legacy on p50 or the single value)\n'
  );
  log(`| List lifecycle (${N_LISTS} lists) | legacy | lookup | ratio |`);
  log('|---|---|---|---|');
  for (const op of Object.keys(lifecycle.legacy))
    log(row(op, lifecycle.legacy[op], lifecycle.lookup[op]));
  for (const kind of ['ip', 'range']) {
    const legacy = results[`${kind}/legacy`];
    const lookup = results[`${kind}/lookup`];
    log(`\n| ${kind === 'ip' ? 'ip list' : 'ip_range list'} | legacy | lookup | ratio |`);
    log('|---|---|---|---|');
    const ops = [...new Set([...Object.keys(legacy), ...Object.keys(lookup)])];
    for (const op of ops) log(row(op, legacy[op], lookup[op]));
  }
  log('\n=== cleanup ===');
  await cleanup();
};

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
