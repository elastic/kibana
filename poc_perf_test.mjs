#!/usr/bin/env node
/*
 * POC performance test: native ES|QL exceptions at scale.
 *
 * Measures the cost of the query shape the POC generates: a chain of
 * `LOOKUP JOIN`s (one per value-list exception) plus inline `WHERE` predicates
 * (scalar exceptions), applied as an anti-join exclusion over a source index.
 *
 * It runs the generated ES|QL directly against Elasticsearch `_query` (this is
 * the dominant cost; it mirrors exactly what esql.ts sends), and sweeps:
 *   - number of value-list LOOKUP JOINs (join fan-out),
 *   - value-list size (rows per lookup index),
 *   - source event volume,
 * then pushes the join count until Elasticsearch errors, to find the ceiling.
 *
 * Usage:
 *   node poc_perf_test.mjs                 # setup + full sweep
 *   node poc_perf_test.mjs --clean         # remove perf indices
 *   EVENTS=100000 LIST_SIZE=1000 node poc_perf_test.mjs
 */

const ES = process.env.ES_URL || 'http://localhost:9200';
const USER = process.env.ES_USER || 'elastic';
const PASS = process.env.ES_PASS || 'changeme';
const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

const EVENTS = Number(process.env.EVENTS || 50000);
const LIST_SIZE = Number(process.env.LIST_SIZE || 500); // ranges per lookup index
const REPEAT = Number(process.env.REPEAT || 3);
const JOIN_SWEEP = (process.env.JOIN_SWEEP || '0,1,2,5,10,20,40').split(',').map(Number);
const SIZE_SWEEP = (process.env.SIZE_SWEEP || '10,100,1000,10000').split(',').map(Number);
const SCALAR_SWEEP = (process.env.SCALAR_SWEEP || '0,50,200').split(',').map(Number);

const SRC = 'poc_perf_src';
const VL = (i) => `poc_perf_vl_${i}`; // range lookup index i
const SZVL = (s) => `poc_perf_sz_${s}`; // size-sweep lookup index
const MAX_JOIN_INDICES = Math.max(...JOIN_SWEEP, 1);

const jbody = { Authorization: auth, 'Content-Type': 'application/json' };
const ndbody = { Authorization: auth, 'Content-Type': 'application/x-ndjson' };

async function es(path, method, body, ndjson = false) {
  const res = await fetch(`${ES}${path}`, {
    method,
    headers: ndjson ? ndbody : jbody,
    body: typeof body === 'string' ? body : body && JSON.stringify(body),
  });
  const t = await res.text();
  return { ok: res.ok, status: res.status, body: t ? JSON.parse(t) : undefined, raw: t };
}

// ---- ip helpers (IPv4 <-> int) ----------------------------------------------
const ipToInt = (a, b, c, d) => ((a << 24) >>> 0) + (b << 16) + (c << 8) + d;
const intToIp = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

// ---- setup ------------------------------------------------------------------
async function bulkNdjson(index, lines) {
  // send in chunks to avoid huge request bodies
  const CHUNK = 5000;
  for (let i = 0; i < lines.length; i += CHUNK) {
    const body = lines.slice(i, i + CHUNK).join('\n') + '\n';
    const r = await es(`/${index}/_bulk?refresh=false`, 'POST', body, true);
    if (r.body?.errors) throw new Error(`bulk errors for ${index}: ${r.raw.slice(0, 400)}`);
  }
  await es(`/${index}/_refresh`, 'POST');
}

async function createSource() {
  await es(`/${SRC}`, 'DELETE', undefined).catch(() => {});
  await es(`/${SRC}`, 'PUT', {
    settings: { number_of_shards: 1, number_of_replicas: 0 },
    mappings: { properties: { '@timestamp': { type: 'date' }, sip: { type: 'ip' }, host: { type: 'keyword' }, code: { type: 'long' } } },
  });
  const now = Date.now();
  const lines = [];
  for (let i = 0; i < EVENTS; i++) {
    // sip uniformly across 10.0.0.0 - 10.255.255.255
    const b = i % 256;
    const c = (i >> 8) % 256;
    const d = (i * 7) % 256;
    const sip = `10.${b}.${c}.${d}`;
    lines.push('{"index":{}}');
    lines.push(JSON.stringify({ '@timestamp': new Date(now - (i % 1000) * 1000).toISOString(), sip, host: `host-${i % 500}`, code: i % 1000 }));
  }
  await bulkNdjson(SRC, lines);
  console.log(`source ${SRC}: ${EVENTS} docs`);
}

// A range lookup index that covers 10.<slot>.0.0 - 10.<slot>.255.255, split into
// `size` non-overlapping consecutive ranges (so it holds `size` rows).
async function createRangeLookup(index, slot, size) {
  await es(`/${index}`, 'DELETE', undefined).catch(() => {});
  await es(`/${index}`, 'PUT', {
    settings: { index: { mode: 'lookup' }, number_of_replicas: 0 },
    mappings: { properties: { vl_start: { type: 'ip' }, vl_end: { type: 'ip' }, vl_mark: { type: 'keyword' } } },
  });
  const base = ipToInt(10, slot % 256, 0, 0);
  const span = 65536; // a /16
  const step = Math.max(1, Math.floor(span / size));
  const lines = [];
  for (let i = 0; i < size; i++) {
    const s = base + i * step;
    const e = base + (i + 1) * step - 1;
    lines.push('{"index":{}}');
    lines.push(JSON.stringify({ vl_start: intToIp(s), vl_end: intToIp(e), vl_mark: '1' }));
  }
  await bulkNdjson(index, lines);
}

async function setup() {
  await createSource();
  const maxSize = Math.max(LIST_SIZE, ...SIZE_SWEEP);
  console.log(`creating ${MAX_JOIN_INDICES} range lookup indices of ${LIST_SIZE} rows each...`);
  for (let i = 0; i < MAX_JOIN_INDICES; i++) await createRangeLookup(VL(i), i, LIST_SIZE);
  console.log('creating size-sweep lookup indices...');
  for (const s of SIZE_SWEEP) await createRangeLookup(SZVL(s), 200, s); // slot 200 = 10.200.x
  console.log('setup done');
}

// ---- query builder (mirrors build_esql_native_exceptions.ts) ----------------
function buildQuery({ joinIndices = [], scalarCount = 0, limit = 10000 }) {
  const stages = [`FROM ${SRC}`];
  const markers = [];
  joinIndices.forEach((idx, i) => {
    stages.push(`| LOOKUP JOIN ${idx} ON sip >= vl_start AND sip <= vl_end`);
    stages.push(`| RENAME vl_mark AS __m${i} | DROP vl_start, vl_end`);
    markers.push(`__m${i} IS NOT NULL`);
  });
  const scalarConds = [];
  for (let i = 0; i < scalarCount; i++) scalarConds.push(`host == "host-absent-${i}"`);
  const conds = [...markers, ...scalarConds];
  if (conds.length) stages.push(`| WHERE NOT (${conds.join(' OR ')})`);
  if (markers.length) stages.push(`| DROP ${markers.map((_, i) => `__m${i}`).join(', ')}`);
  stages.push(`| LIMIT ${limit}`);
  return stages.join('\n');
}

async function timeQuery(query) {
  const runs = [];
  let rows = null;
  let error = null;
  for (let r = 0; r < REPEAT; r++) {
    const t0 = performance.now();
    const res = await es(`/_query?drop_null_columns=true`, 'POST', { query });
    const wall = performance.now() - t0;
    if (!res.ok) {
      error = (res.body?.error?.reason || res.raw || '').slice(0, 200);
      break;
    }
    rows = res.body.values.length;
    runs.push({ wall, took: res.body.took });
  }
  if (error) return { error };
  runs.sort((a, b) => a.wall - b.wall);
  const med = runs[Math.floor(runs.length / 2)];
  return { rows, medWall: Math.round(med.wall), minWall: Math.round(runs[0].wall), medTook: med.took };
}

function row(cols) {
  return cols.map((c, i) => String(c).padEnd([26, 10, 10, 10, 10][i] || 10)).join(' ');
}

// ---- sweeps -----------------------------------------------------------------
async function joinSweep() {
  console.log(`\n=== JOIN FAN-OUT SWEEP (events=${EVENTS}, list_size=${LIST_SIZE}, repeat=${REPEAT}) ===`);
  console.log(row(['config', 'rows', 'medTook', 'medWall', 'minWall']));
  for (const j of JOIN_SWEEP) {
    const q = buildQuery({ joinIndices: Array.from({ length: j }, (_, i) => VL(i)) });
    const r = await timeQuery(q);
    if (r.error) console.log(row([`${j} joins`, 'ERR', r.error, '', '']));
    else console.log(row([`${j} joins`, r.rows, r.medTook + 'ms', r.medWall + 'ms', r.minWall + 'ms']));
  }
}

async function sizeSweep() {
  console.log(`\n=== VALUE-LIST SIZE SWEEP (1 join, events=${EVENTS}) ===`);
  console.log(row(['config', 'rows', 'medTook', 'medWall', 'minWall']));
  for (const s of SIZE_SWEEP) {
    const q = buildQuery({ joinIndices: [SZVL(s)] });
    const r = await timeQuery(q);
    if (r.error) console.log(row([`${s} ranges`, 'ERR', r.error, '', '']));
    else console.log(row([`${s} ranges`, r.rows, r.medTook + 'ms', r.medWall + 'ms', r.minWall + 'ms']));
  }
}

async function scalarSweep() {
  console.log(`\n=== SCALAR EXCEPTION SWEEP (inline WHERE terms, 0 joins, events=${EVENTS}) ===`);
  console.log(row(['config', 'rows', 'medTook', 'medWall', 'minWall']));
  for (const n of SCALAR_SWEEP) {
    const q = buildQuery({ scalarCount: n });
    const r = await timeQuery(q);
    if (r.error) console.log(row([`${n} terms`, 'ERR', r.error, '', '']));
    else console.log(row([`${n} terms`, r.rows, r.medTook + 'ms', r.medWall + 'ms', r.minWall + 'ms']));
  }
}

async function findJoinCeiling() {
  console.log(`\n=== PUSH JOIN COUNT TO THE LIMIT (reusing indices cyclically) ===`);
  let lastOk = 0;
  for (const j of [40, 60, 80, 100, 150, 200, 300, 500]) {
    const q = buildQuery({ joinIndices: Array.from({ length: j }, (_, i) => VL(i % MAX_JOIN_INDICES)) });
    const t0 = performance.now();
    const res = await es(`/_query?drop_null_columns=true`, 'POST', { query: q });
    const wall = Math.round(performance.now() - t0);
    if (!res.ok) {
      console.log(`  ${j} joins -> ERROR (${wall}ms): ${(res.body?.error?.reason || res.raw || '').slice(0, 180)}`);
      break;
    }
    console.log(`  ${j} joins -> ok, ${res.body.values.length} rows, took ${res.body.took}ms wall ${wall}ms`);
    lastOk = j;
  }
  console.log(`  highest join count that succeeded: ${lastOk}`);
}

async function clean() {
  await es(`/${SRC}`, 'DELETE').catch(() => {});
  for (let i = 0; i < MAX_JOIN_INDICES; i++) await es(`/${VL(i)}`, 'DELETE').catch(() => {});
  for (const s of SIZE_SWEEP) await es(`/${SZVL(s)}`, 'DELETE').catch(() => {});
  console.log('cleaned perf indices');
}

async function main() {
  if (process.argv.includes('--clean')) return clean();
  await setup();
  await scalarSweep();
  await joinSweep();
  await sizeSweep();
  await findJoinCeiling();
  console.log('\nDone. (run with --clean to remove perf indices)');
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
