#!/usr/bin/env node
/*
 * ES|QL migration investigation - test harness
 * ------------------------------------------------------------------
 * Standalone Node.js (>=18, uses global fetch). No dependencies.
 *
 * Runs scenarios that reproduce the ES|QL gaps found while evaluating the
 * Security detection rule types (Threshold, New Terms, Indicator Match).
 *
 * Usage:
 *   node esql_investigation_tests.mjs                                      # count_distinct perf, defaults
 *   node esql_investigation_tests.mjs count_distinct --cardinalities=100000,1000000,5000000
 *   node esql_investigation_tests.mjs count_distinct --groups=100000 --precision=40000   # circuit-breaker path
 *   node esql_investigation_tests.mjs count_distinct --docs-per-value=5 --repeats=5 --warmup=1
 *   node esql_investigation_tests.mjs type_conflict
 *   node esql_investigation_tests.mjs row_cap
 *   node esql_investigation_tests.mjs new_terms_first --docs=200000 --cardinality=50000 --mv=3
 *   node esql_investigation_tests.mjs new_terms_first --breaker=150mb   # force the [First] circuit-breaker at any heap
 *   node esql_investigation_tests.mjs --list
 *
 * Config (env):
 *   ES_URL   (default http://localhost:9200)
 *   ES_AUTH  (default elastic:changeme)
 *
 * Flags: --key=value  (booleans: --keep, --list). Comma lists for --cardinalities.
 */

const ES_URL = process.env.ES_URL || 'http://localhost:9200';
const ES_AUTH = process.env.ES_AUTH || 'elastic:changeme';
const AUTH_HEADER = 'Basic ' + Buffer.from(ES_AUTH).toString('base64');

// ---------------------------------------------------------------------------
// Tiny ES client
// ---------------------------------------------------------------------------

async function esRequest(method, path, body, { ndjson = false } = {}) {
  const headers = {
    Authorization: AUTH_HEADER,
    'Content-Type': ndjson ? 'application/x-ndjson' : 'application/json',
  };
  const res = await fetch(ES_URL + path, { method, headers, body });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, body: json };
}

async function esql(query, extra = {}) {
  const t0 = performance.now();
  const { status, body } = await esRequest('POST', '/_query', JSON.stringify({ query, ...extra }));
  const wallMs = performance.now() - t0;
  return { status, body, wallMs, tookMs: body.took, error: body.error, values: body.values, columns: body.columns };
}

const deleteIndex = (index) => esRequest('DELETE', `/${index}`);
const createIndex = (index, mapping) => esRequest('PUT', `/${index}`, JSON.stringify(mapping));
const refresh = (index) => esRequest('POST', `/${index}/_refresh`);

async function bulkIndex(index, total, docFn, { chunkSize = 10000, onProgress } = {}) {
  for (let start = 0; start < total; start += chunkSize) {
    const end = Math.min(start + chunkSize, total);
    let ndjson = '';
    for (let i = start; i < end; i++) {
      ndjson += '{"index":{}}\n' + JSON.stringify(docFn(i)) + '\n';
    }
    const { body } = await esRequest('POST', `/${index}/_bulk`, ndjson, { ndjson: true });
    if (body.errors) {
      const firstErr = (body.items || []).find((it) => it.index && it.index.error);
      throw new Error(`bulk error in ${index}: ${JSON.stringify(firstErr && firstErr.index.error)}`);
    }
    if (onProgress) onProgress(end, total);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

const progressBar = (done, total) => {
  if (done === total || done % 100000 === 0) {
    process.stdout.write(`\r    indexed ${done}/${total}`);
    if (done === total) process.stdout.write('\n');
  }
};

// ---------------------------------------------------------------------------
// Scenario: COUNT_DISTINCT PERFORMANCE  (Threshold es#154881)
// ---------------------------------------------------------------------------
// Focus: query latency as cardinality / group count / precision scale, and
// capturing the circuit-breaker trip that is the v1 team's stated blocker.
// Accuracy (approximate above precision, hard 40000 ceiling) is documented
// separately and intentionally NOT re-tested here.

async function scenarioCountDistinct(opts) {
  const cardinalities = (opts.cardinalities || '100000,1000000,5000000').split(',').map(Number);
  const docsPerValue = Number(opts.docsPerValue || opts['docs-per-value'] || 1);
  const repeats = Number(opts.repeats || 3);
  const warmup = Number(opts.warmup ?? 1);
  const groups = Number(opts.groups || 0); // 0 => ungrouped single COUNT_DISTINCT
  const precision = opts.precision ? Number(opts.precision) : null; // null => engine default (3000)

  console.log(`\nScenario: count_distinct (performance)`);
  console.log(
    `  cardinalities=${cardinalities.join(',')} docsPerValue=${docsPerValue} ` +
      `groups=${groups || 'none'} precision=${precision || 'default(3000)'} warmup=${warmup} repeats=${repeats}\n`
  );

  const cd = precision ? `COUNT_DISTINCT(uid, ${precision})` : `COUNT_DISTINCT(uid)`;
  const results = [];

  for (const C of cardinalities) {
    const index = `esqltest-cd-${C}${groups ? `-g${groups}` : ''}`;
    const total = C * docsPerValue;
    const perGroup = groups ? Math.ceil(C / groups) : null;
    console.log(
      `  [${index}] indexing ${total} docs (${C} distinct${groups ? `, ${groups} groups ~${perGroup}/group` : ''})...`
    );
    await deleteIndex(index);
    await createIndex(index, {
      settings: { number_of_shards: Number(opts.shards || 1) },
      mappings: { properties: { uid: { type: 'keyword' }, grp: { type: 'keyword' } } },
    });
    await bulkIndex(
      index,
      total,
      (i) => {
        const base = i % C;
        const doc = { uid: `u${base}` };
        if (groups) doc.grp = `g${base % groups}`;
        return doc;
      },
      { onProgress: progressBar }
    );
    await refresh(index);

    const query = groups
      ? `FROM ${index} | STATS d = ${cd} BY grp | LIMIT 10000`
      : `FROM ${index} | STATS d = ${cd}`;

    // discarded warmup run(s)
    for (let w = 0; w < warmup; w++) await esql(query);

    const tooks = [];
    const walls = [];
    let errorReason = null;
    for (let r = 0; r < repeats; r++) {
      const res = await esql(query);
      if (res.error) {
        errorReason = `${res.error.type}: ${(res.error.reason || '').slice(0, 140)}`;
        break;
      }
      tooks.push(res.tookMs);
      walls.push(Math.round(res.wallMs));
    }

    results.push({
      cardinality: C,
      docs: total,
      groups: groups || '-',
      precision: precision || 'def',
      status: errorReason ? 'ERROR' : 'ok',
      took_min_ms: errorReason ? '-' : Math.min(...tooks),
      took_median_ms: errorReason ? '-' : median(tooks),
      took_max_ms: errorReason ? '-' : Math.max(...tooks),
      wall_median_ms: errorReason ? '-' : median(walls),
      error: errorReason || '',
    });

    if (!opts.keep) await deleteIndex(index);
  }

  console.log('');
  console.table(results);
  console.log('\nNotes:');
  console.log('  * Performance only. Accuracy (approximate above precision, hard 40000 ceiling) is');
  console.log('    documented separately and not tested here.');
  console.log('  * took_*_ms is Elasticsearch-side (response.took); wall includes network. First run is a discarded warmup.');
  console.log('  * Circuit-breaker path: raise --groups (one HLL sketch per group) and --precision=40000');
  console.log('    (larger sketches). status=ERROR captures a breaker trip and its reason. Reproducing it');
  console.log('    needs enough data / a constrained heap; a generous local heap may keep returning ok.');
  return results;
}

// ---------------------------------------------------------------------------
// Scenario: multi-index mapping type conflict  (Threshold es#154883)
// ---------------------------------------------------------------------------

async function scenarioTypeConflict(opts) {
  console.log('\nScenario: type_conflict (same field, different types across indices)\n');
  const a = 'esqltest-tc-a';
  const b = 'esqltest-tc-b';
  await deleteIndex(a);
  await deleteIndex(b);
  await createIndex(a, { mappings: { properties: { k: { type: 'keyword' } } } });
  await createIndex(b, { mappings: { properties: { k: { type: 'long' } } } });
  await esRequest('POST', `/${a}/_doc?refresh=true`, JSON.stringify({ k: 'alpha' }));
  await esRequest('POST', `/${b}/_doc?refresh=true`, JSON.stringify({ k: 123 }));

  const conflict = await esql(`FROM ${a},${b} | STATS c = COUNT(*) BY k`);
  const workaround = await esql(`FROM ${a},${b} | EVAL kk = k::keyword | STATS c = COUNT(*) BY kk`);

  console.log('  direct STATS BY k:');
  console.log(
    '    ',
    conflict.error
      ? `ERROR ${conflict.error.type}: ${(conflict.error.reason || '').split('\n').pop()}`
      : `ok ${JSON.stringify(conflict.values)}`
  );
  console.log('  EVAL k::keyword workaround:');
  console.log(
    '    ',
    workaround.error
      ? `ERROR ${workaround.error.type}: ${(workaround.error.reason || '').slice(0, 120)}`
      : `ok ${JSON.stringify(workaround.values)}`
  );

  if (!opts.keep) {
    await deleteIndex(a);
    await deleteIndex(b);
  }
  return { conflict: !!conflict.error, workaroundWorks: !workaround.error };
}

// ---------------------------------------------------------------------------
// Scenario: row cap / silent truncation  (Threshold + New Terms, no ticket)
// ---------------------------------------------------------------------------

async function scenarioRowCap(opts) {
  const distinctGroups = Number(opts.groups || 50000);
  console.log(`\nScenario: row_cap (${distinctGroups} qualifying groups exist)\n`);
  const index = 'esqltest-rowcap';
  await deleteIndex(index);
  await createIndex(index, { mappings: { properties: { uid: { type: 'keyword' } } } });
  console.log(`  indexing ${distinctGroups} docs...`);
  await bulkIndex(index, distinctGroups, (i) => ({ uid: `u${i}` }), { onProgress: progressBar });
  await refresh(index);

  const limits = ['(none)', 'LIMIT 10000', 'LIMIT 50000'];
  const results = [];
  for (const lim of limits) {
    const tail = lim === '(none)' ? '' : `| ${lim}`;
    const res = await esql(`FROM ${index} | STATS c = COUNT(*) BY uid | WHERE c >= 1 ${tail}`);
    results.push({
      limit: lim,
      rows_returned: res.error ? `ERROR ${res.error.type}` : res.values ? res.values.length : 0,
      groups_dropped: res.error ? '-' : distinctGroups - (res.values ? res.values.length : 0),
    });
  }
  console.table(results);
  console.log('  (ES|QL never returns more than 10000 rows regardless of LIMIT, with no Warning header.)');

  if (!opts.keep) await deleteIndex(index);
  return results;
}

// ---------------------------------------------------------------------------
// Scenario: STATS + FIRST at high MV cardinality  (New Terms es#154876)
// ---------------------------------------------------------------------------
// Reproduces the "Test 2" workload: MV fields (mv=3), high cardinality, and the
// STATS + FIRST alert-attribution shape. Group count = the cross product of the
// MV key values, and each FIRST(field) holds per-group state, so at high
// combination cardinality the memory exceeds the request limit and the query
// fails on the [First] operator (parent circuit breaker). On a large-heap
// cluster the default may return ok; --breaker lowers indices.breaker.request.limit
// so the failure reproduces at any heap.

async function scenarioNewTermsFirst(opts) {
  const docs = Number(opts.docs || 200000);
  const C = Number(opts.cardinality || 50000);
  const mv = Number(opts.mv || 3);
  const repeats = Number(opts.repeats || 2);
  const warmup = Number(opts.warmup ?? 1);
  const extraFirst = Number(opts['first-fields'] || 0);
  const breaker = opts.breaker; // e.g. "150mb": temporarily lowers indices.breaker.request.limit
  const TS = '2026-08-01T00:00:00.000Z';

  console.log(`\nScenario: new_terms_first (STATS + FIRST at high MV cardinality)`);
  console.log(
    `  docs=${docs} cardinality=${C}/field mv=${mv} extraFirstFields=${extraFirst} repeats=${repeats}` +
      (breaker ? ` requestBreaker=${breaker}` : '') +
      `\n`
  );

  const idx = 'esqltest-nt-first';
  await deleteIndex(idx);
  await createIndex(idx, {
    settings: { number_of_shards: Number(opts.shards || 1) },
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        host: { properties: { name: { type: 'keyword' } } },
        user: { properties: { name: { type: 'keyword' } } },
        extra: { type: 'keyword' },
      },
    },
  });
  console.log(`  indexing ${docs} docs (mv=${mv}, ${C} distinct/field)...`);
  await bulkIndex(
    idx,
    docs,
    (i) => ({
      '@timestamp': TS,
      host: { name: Array.from({ length: mv }, (_, k) => `h${(i * mv + k) % C}`) },
      user: { name: Array.from({ length: mv }, (_, k) => `u${(i * mv + k + 7) % C}`) },
      extra: `e${i % C}`,
    }),
    { onProgress: progressBar }
  );
  await refresh(idx);

  const firstCols = [
    'first_seen = MIN(@timestamp)',
    'first_id = FIRST(_id, @timestamp)',
    'first_index = FIRST(_index, @timestamp)',
  ];
  for (let k = 0; k < extraFirst; k++) firstCols.push(`x${k} = FIRST(extra, @timestamp)`);
  const stats = firstCols.join(', ');

  const configs = [
    { label: '1 MV', by: 'host.name' },
    { label: '2 MV', by: 'host.name, user.name' },
    { label: '2 MV + 1 SV', by: 'host.name, user.name, extra' },
  ];

  if (breaker) {
    await esRequest('PUT', '/_cluster/settings', JSON.stringify({ persistent: { 'indices.breaker.request.limit': breaker } }));
    console.log(`  (lowered indices.breaker.request.limit to ${breaker})\n`);
  }

  const results = [];
  try {
    for (const cfg of configs) {
      const query = `FROM ${idx} METADATA _id, _index | STATS ${stats} BY ${cfg.by}`;
      for (let w = 0; w < warmup; w++) await esql(query);
      const tooks = [];
      let err = null;
      for (let r = 0; r < repeats; r++) {
        const res = await esql(query);
        if (res.error) {
          err = `${res.error.type}: ${(res.error.reason || '').slice(0, 120)}`;
          break;
        }
        tooks.push(res.tookMs);
      }
      results.push({
        config: cfg.label,
        group_fields: cfg.by,
        status: err ? 'ERROR' : 'ok',
        took_median_ms: err ? '-' : median(tooks),
        took_max_ms: err ? '-' : Math.max(...tooks),
        error: err || '',
      });
    }
  } finally {
    if (breaker) {
      await esRequest('PUT', '/_cluster/settings', JSON.stringify({ persistent: { 'indices.breaker.request.limit': null } }));
      console.log('  (restored indices.breaker.request.limit)');
    }
    if (!opts.keep) await deleteIndex(idx);
  }

  console.log('');
  console.table(results);
  console.log('\nNotes:');
  console.log('  * Group count = the cross product of the MV key values; each FIRST(field) is per-group state.');
  console.log('  * status=ERROR with circuit_breaking_exception on [First] is the reproduction of the reported failure.');
  console.log('  * On a large-heap cluster the default may return ok. Force it with --breaker=150mb (request breaker,');
  console.log('    restored after), or scale --docs / --cardinality / --mv / --first-fields up.');
  return results;
}

// ---------------------------------------------------------------------------
// Registry + CLI
// ---------------------------------------------------------------------------

const SCENARIOS = {
  count_distinct: scenarioCountDistinct, // Threshold es#154881 (performance)
  type_conflict: scenarioTypeConflict, // Threshold es#154883
  row_cap: scenarioRowCap, // Threshold + New Terms, untracked
  new_terms_first: scenarioNewTermsFirst, // New Terms es#154876 (STATS + FIRST memory at high MV cardinality)
  // TODO(indicator_match): cross_type -> IN key across conflicting types (es#155881)
};

function parseArgs(argv) {
  const opts = {};
  let scenario = null;
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [k, v] = arg.slice(2).split('=');
      opts[k] = v === undefined ? true : v;
    } else if (!scenario) {
      scenario = arg;
    }
  }
  return { scenario, opts };
}

async function preflight() {
  const { status, body } = await esRequest('GET', '/');
  if (status !== 200) throw new Error(`ES not reachable at ${ES_URL} (status ${status})`);
  console.log(`Elasticsearch ${body.version?.number} @ ${ES_URL} (cluster: ${body.cluster_name})`);
}

async function main() {
  const { scenario, opts } = parseArgs(process.argv.slice(2));

  if (opts.list) {
    console.log('Scenarios:', Object.keys(SCENARIOS).join(', '));
    return;
  }

  await preflight();

  const name = scenario || 'count_distinct';
  const fn = SCENARIOS[name];
  if (!fn) {
    console.error(`Unknown scenario "${name}". Available: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(1);
  }
  await fn(opts);
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
