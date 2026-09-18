#!/usr/bin/env node
/*
 * Performance test: a large value list in a New Terms rule vs an equivalent ES|QL query.
 *
 * Compares two ways of running "New Terms + two value-list exceptions" over the same data:
 *   1. the real New Terms detection rule (its exception evaluation reads the value lists), and
 *   2. an ES|QL query that emulates it: INLINE STATS for the new-terms detection, and a
 *      LOOKUP JOIN per list for the two exception membership tests.
 *
 * Setup (NOT cleaned up afterwards, so it can be reused across runs):
 *   - two large keyword value lists (LIST_SIZE items each, default 5,000,000)
 *   - an events index with EVENT_COUNT docs (default 500,000)
 *   - a New Terms rule on `username`
 *   - two exceptions: field_a INCLUDED in list 1 (whitelist), field_b EXCLUDED from list 2
 *
 * It then runs the rule (via _run_soon, reading the execution metrics) and the ES|QL query
 * (reading `took`), reports both, and prints the ES|QL query for you to run yourself.
 *
 * Reruns are cheap: if the indices already hold the target counts, generation is skipped
 * (set FORCE=1 to regenerate). Tune with env vars, e.g. a quick smoke run:
 *   LIST_SIZE=50000 EVENT_COUNT=20000 node perf_newterms_esql.mjs
 *
 * Connects to the serverless project with an API key. Do NOT commit a real key.
 */

// ----------------------------------------------------------------- config

const KB = (process.env.KIBANA_URL ?? 'https://newterms-lookup-indices-acee57.kb.europe-west1.gcp.elastic.cloud').replace(/\/$/, '');
const ES = (process.env.ES_URL ?? KB.replace('.kb.', '.es.')).replace(/\/$/, '');
const API_KEY = process.env.API_KEY ?? 'am8zNWlxQUJIVmQyLTlHU0YxcC06bjFTMGZ6WTBUMjdmaXMzX0FSank5dw==';

const SPACE = 'default';
const LIST_SIZE = Number(process.env.LIST_SIZE ?? 5_000_000);
const EVENT_COUNT = Number(process.env.EVENT_COUNT ?? 500_000);
const BULK_BATCH = Number(process.env.BULK_BATCH ?? 10_000);
const FORCE = process.env.FORCE === '1';

// fraction of events whose exception field value is actually a member of the list
const MEMBER_A_FRAC = 0.5; // field_a in list1  (inclusion exception -> these get whitelisted)
const MEMBER_B_FRAC = 0.5; // field_b in list2  (exclusion exception -> non-members whitelisted)
// how much of the current window uses brand-new usernames (these are the "new terms")
const NEW_TERM_FRAC = 0.2;
const HIST_USERS = 100_000; // distinct usernames seen in history (never "new")
const NEW_USERS = 5_000; // distinct usernames only in the current window (the new terms)

const LIST1 = 'perf-nt-list1';
const LIST2 = 'perf-nt-list2';
const LIST_TYPE = 'keyword';
const EVENTS_INDEX = 'perf-nt-events';
const EXC_LIST = 'perf-nt-exceptions';
const RULE_ID = 'perf-nt-rule';
const RULE_NAME = 'PERF New Terms + value-list exceptions';

// ----------------------------------------------------------------- http

const baseHeaders = {
  authorization: `ApiKey ${API_KEY}`,
  'content-type': 'application/json',
  'kbn-xsrf': 'perf',
  'x-elastic-internal-origin': 'perf',
  'elastic-api-version': '2023-10-31',
};

const kbn = async (method, path, body, extraHeaders = {}) => {
  const res = await fetch(`${KB}${path}`, {
    method,
    headers: { ...baseHeaders, ...extraHeaders },
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
    headers: {
      authorization: `ApiKey ${API_KEY}`,
      'content-type': typeof body === 'string' ? 'application/x-ndjson' : 'application/json',
    },
    body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, json: text ? JSON.parse(text) : {} };
  } catch {
    return { status: res.status, json: { raw: text } };
  }
};

const esql = async (query) => {
  const res = await fetch(`${ES}/_query`, {
    method: 'POST',
    headers: { authorization: `ApiKey ${API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
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

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randInt = (n) => Math.floor(Math.random() * n);

// ----------------------------------------------------------------- helpers

const countDocs = async (index) => {
  const r = await es('POST', `/${index}/_count`, {});
  return r.status === 200 ? r.json.count ?? 0 : -1;
};

// bulk-index `count` docs produced by makeDoc(i), in batches, no per-batch refresh.
// action 'create' is required for data streams (append-only, no custom _id).
const bulkLoad = async (index, count, makeDoc, label, action = 'index') => {
  const t0 = Date.now();
  let done = 0;
  while (done < count) {
    const n = Math.min(BULK_BATCH, count - done);
    let ndjson = '';
    for (let k = 0; k < n; k++) {
      const { _id, doc } = makeDoc(done + k);
      const meta = action === 'create' ? { create: {} } : _id != null ? { index: { _id } } : { index: {} };
      ndjson += JSON.stringify(meta) + '\n';
      ndjson += JSON.stringify(doc) + '\n';
    }
    const r = await es('POST', `/${index}/_bulk?filter_path=errors,items.*.error`, ndjson);
    if (r.status >= 400 || r.json.errors) {
      const firstErr = r.json.items?.find((i) => Object.values(i)[0]?.error)?.[action]?.error;
      throw new Error(`bulk into ${index} failed: ${r.status} ${JSON.stringify(firstErr ?? r.json).slice(0, 300)}`);
    }
    done += n;
    if (done % (BULK_BATCH * 10) === 0 || done === count) {
      const rate = Math.round(done / ((Date.now() - t0) / 1000));
      log(`  ${label}: ${done.toLocaleString()}/${count.toLocaleString()} (${rate.toLocaleString()}/s)`);
    }
  }
  await es('POST', `/${index}/_refresh`);
};

// count legacy value-list items for one list
const countListItems = async (listId) => {
  const r = await es('POST', `/.items-${SPACE}/_count`, { query: { term: { list_id: listId } } });
  return r.status === 200 ? r.json.count ?? 0 : -1;
};

/*
 * Build one list in BOTH storage forms:
 *   - the legacy value list (.items data stream), which the RULE's exception reads. This is
 *     the "large value list in a rule" baseline.
 *   - a parallel lookup-mode index (perf-nt-<id>-lookup) holding {value, member:true}, which
 *     the ES|QL query LOOKUP JOINs. This is the proposed storage under test.
 * Both hold the same LIST_SIZE values (`<prefix>-0..N`), so membership is identical.
 */
const setupList = async (listId, valuePrefix) => {
  const lookupIndex = `${listId}-lookup`;

  // 1. legacy value list for the rule
  const c = await kbn('POST', '/api/lists', { id: listId, type: LIST_TYPE, name: listId, description: `perf ${listId}` });
  if (c.status >= 400 && !JSON.stringify(c.json).includes('already exists')) {
    throw new Error(`create list ${listId} failed: ${c.status} ${JSON.stringify(c.json)}`);
  }
  const haveItems = await countListItems(listId);
  if (FORCE || haveItems < LIST_SIZE) {
    const nowIso = new Date().toISOString();
    await bulkLoad(
      `.items-${SPACE}`,
      LIST_SIZE,
      (i) => ({
        doc: {
          '@timestamp': nowIso,
          created_at: nowIso,
          created_by: 'perf',
          list_id: listId,
          tie_breaker_id: `${valuePrefix}-tb-${i}`,
          updated_at: nowIso,
          updated_by: 'perf',
          keyword: `${valuePrefix}-${i}`,
        },
      }),
      `${listId} items`,
      'create'
    );
  } else {
    log(`  ${listId} items: already ${haveItems.toLocaleString()}, skipping (FORCE=1 to redo)`);
  }

  // 2. parallel lookup-mode index for ES|QL
  await es('PUT', `/${lookupIndex}`, {
    settings: { index: { mode: 'lookup' } },
    mappings: { properties: { value: { type: 'keyword' }, member: { type: 'boolean' } } },
  });
  const haveLookup = await countDocs(lookupIndex);
  if (FORCE || haveLookup < LIST_SIZE) {
    await bulkLoad(
      lookupIndex,
      LIST_SIZE,
      (i) => ({ _id: `${valuePrefix}-${i}`, doc: { value: `${valuePrefix}-${i}`, member: true } }),
      `${listId} lookup`
    );
  } else {
    log(`  ${listId} lookup: already ${haveLookup.toLocaleString()}, skipping (FORCE=1 to redo)`);
  }

  return { listId, lookupIndex, valuePrefix };
};

// ----------------------------------------------------------------- setup steps

const setupLists = async () => {
  log('\n=== value lists (legacy .items for the rule + parallel lookup index for ES|QL) ===');
  await kbn('POST', '/api/lists/index'); // bootstrap the .lists/.items data streams (idempotent)
  const l1 = await setupList(LIST1, 'l1');
  const l2 = await setupList(LIST2, 'l2');
  return { l1, l2 };
};

const setupEvents = async () => {
  log('\n=== events ===');
  await es('PUT', `/${EVENTS_INDEX}`, {
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        username: { type: 'keyword' },
        field_a: { type: 'keyword' },
        field_b: { type: 'keyword' },
        'host.name': { type: 'keyword' },
      },
    },
  });

  const have = await countDocs(EVENTS_INDEX);
  if (!FORCE && have >= EVENT_COUNT) {
    log(`  events: already has ${have.toLocaleString()} docs, skipping generation (FORCE=1 to redo)`);
    return;
  }

  const now = Date.now();
  const hourMs = 3600_000;
  const dayMs = 24 * hourMs;
  // history window: [now-7d, now-65m]; current window: [now-55m, now-2m]. `from` (now-60m) splits them.
  const histStart = now - 7 * dayMs;
  const histEnd = now - 65 * 60_000;
  const curStart = now - 55 * 60_000;
  const curEnd = now - 2 * 60_000;
  const currentCount = Math.floor(EVENT_COUNT * 0.2); // 20% of events are in the current window

  await bulkLoad(
    EVENTS_INDEX,
    EVENT_COUNT,
    (i) => {
      const isCurrent = i < currentCount;
      const ts = isCurrent
        ? curStart + randInt(curEnd - curStart)
        : histStart + randInt(histEnd - histStart);
      // usernames: history uses the "seen" vocabulary; current uses new usernames NEW_TERM_FRAC of the time
      const username =
        isCurrent && Math.random() < NEW_TERM_FRAC
          ? `n-${randInt(NEW_USERS)}` // brand-new term (only in current window)
          : `u-${randInt(HIST_USERS)}`; // previously seen term
      const field_a =
        Math.random() < MEMBER_A_FRAC ? `l1-${randInt(LIST_SIZE)}` : `x1-${randInt(LIST_SIZE)}`;
      const field_b =
        Math.random() < MEMBER_B_FRAC ? `l2-${randInt(LIST_SIZE)}` : `x2-${randInt(LIST_SIZE)}`;
      return {
        _id: `e-${i}`,
        doc: { '@timestamp': new Date(ts).toISOString(), username, field_a, field_b, host: { name: 'perf' } },
      };
    },
    'events'
  );
};

const setupExceptions = async () => {
  log('\n=== exceptions ===');
  await kbn('POST', '/api/exception_lists', {
    list_id: EXC_LIST,
    name: EXC_LIST,
    description: EXC_LIST,
    type: 'detection',
    namespace_type: 'single',
  });
  // item 1: field_a IS in list1 -> whitelist (inclusion)
  await kbn('POST', '/api/exception_lists/items', {
    list_id: EXC_LIST,
    name: 'field_a included in list1',
    description: 'whitelist events whose field_a is in list1',
    type: 'simple',
    namespace_type: 'single',
    entries: [{ field: 'field_a', operator: 'included', type: 'list', list: { id: LIST1, type: LIST_TYPE } }],
  });
  // item 2: field_b is NOT in list2 -> whitelist (exclusion)
  await kbn('POST', '/api/exception_lists/items', {
    list_id: EXC_LIST,
    name: 'field_b excluded from list2',
    description: 'whitelist events whose field_b is not in list2',
    type: 'simple',
    namespace_type: 'single',
    entries: [{ field: 'field_b', operator: 'excluded', type: 'list', list: { id: LIST2, type: LIST_TYPE } }],
  });
  const got = await kbn('GET', `/api/exception_lists?list_id=${EXC_LIST}&namespace_type=single`);
  return got.json.id;
};

const setupRule = async (excId) => {
  log('\n=== rule ===');
  await kbn('DELETE', `/api/detection_engine/rules?rule_id=${RULE_ID}`); // start from a clean rule each run
  const create = await kbn('POST', '/api/detection_engine/rules', {
    rule_id: RULE_ID,
    name: RULE_NAME,
    description: 'perf: new terms with two large value-list exceptions',
    type: 'new_terms',
    new_terms_fields: ['username'],
    history_window_start: 'now-7d',
    index: [EVENTS_INDEX],
    query: '*',
    language: 'kuery',
    from: 'now-60m',
    interval: '5m',
    max_signals: 1000, // the Kibana alerting per-run limit; keeps status clean
    risk_score: 50,
    severity: 'medium',
    enabled: true,
    exceptions_list: [{ id: excId, list_id: EXC_LIST, type: 'detection', namespace_type: 'single' }],
  });
  if (create.status >= 400) throw new Error(`create rule failed: ${create.status} ${JSON.stringify(create.json)}`);
  return create.json.id; // the alerting rule id, used by _run_soon
};

// ----------------------------------------------------------------- run + measure

const runRuleAndMeasure = async (alertingId) => {
  log('\n=== running the New Terms rule ===');
  const before = await kbn('GET', `/api/detection_engine/rules?rule_id=${RULE_ID}`);
  const beforeDate = before.json?.execution_summary?.last_execution?.date ?? '';

  const t0 = Date.now();
  await kbn('POST', `/internal/alerting/rule/${alertingId}/_run_soon`);

  // poll until a newer execution summary appears
  let summary;
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const r = await kbn('GET', `/api/detection_engine/rules?rule_id=${RULE_ID}`);
    const last = r.json?.execution_summary?.last_execution;
    if (last?.date && last.date !== beforeDate && last.status !== 'going to run' && last.status !== 'running') {
      summary = last;
      break;
    }
  }
  const wallMs = Date.now() - t0;

  // the execution_summary omits search duration for new terms; the execution-results API has it
  const end = new Date().toISOString();
  const start = new Date(Date.now() - 15 * 60_000).toISOString();
  const results = await kbn(
    'GET',
    `/internal/detection_engine/rules/${alertingId}/execution/results?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&per_page=1&sort_field=timestamp&sort_order=desc`
  );
  const execEvent = results.json?.events?.[0];
  return { execEvent, summary, wallMs };
};

const buildEsqlQuery = (l1Index, l2Index) => {
  const now = new Date();
  const historyStart = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
  const currentStart = new Date(now.getTime() - 60 * 60_000).toISOString();
  const nowIso = now.toISOString();
  return `FROM ${EVENTS_INDEX}
| WHERE @timestamp >= TO_DATETIME("${historyStart}") AND @timestamp <= TO_DATETIME("${nowIso}")
| INLINE STATS first_seen = MIN(@timestamp) BY username
| WHERE first_seen >= TO_DATETIME("${currentStart}")
| RENAME field_a AS value
| LOOKUP JOIN ${l1Index} ON value
| RENAME value AS field_a, member AS in_list1
| WHERE in_list1 IS NULL
| RENAME field_b AS value
| LOOKUP JOIN ${l2Index} ON value
| RENAME value AS field_b, member AS in_list2
| WHERE in_list2 IS NOT NULL
| STATS surviving_events = COUNT(*), distinct_new_terms = COUNT_DISTINCT(username)`;
};

const runEsqlAndMeasure = async (query) => {
  log('\n=== running the equivalent ES|QL query ===');
  // warm once, then take the best of 3 measured runs
  await esql(query);
  const tooks = [];
  let last;
  for (let i = 0; i < 3; i++) {
    const r = await esql(query);
    if (r.status >= 400) return { error: r.json, tooks: [] };
    last = r.json;
    tooks.push(r.json.took);
  }
  return { last, tooks };
};

// ----------------------------------------------------------------- main

const main = async () => {
  log(`Kibana: ${KB}`);
  log(`ES:     ${ES}`);
  log(`config: LIST_SIZE=${LIST_SIZE.toLocaleString()} EVENT_COUNT=${EVENT_COUNT.toLocaleString()} BULK_BATCH=${BULK_BATCH} FORCE=${FORCE}`);

  const { l1, l2 } = await setupLists();
  await setupEvents();
  const excId = await setupExceptions();
  const alertingId = await setupRule(excId);

  const { execEvent, summary, wallMs } = await runRuleAndMeasure(alertingId);

  const query = buildEsqlQuery(l1.lookupIndex, l2.lookupIndex);
  const esqlResult = await runEsqlAndMeasure(query);

  // ------------------------------------------------------------- report
  log('\n\n======================= RESULTS =======================');
  log(`\nData:`);
  log(`  list1 legacy items (.items-${SPACE} list_id=${LIST1}): ${(await countListItems(LIST1)).toLocaleString()}`);
  log(`  list2 legacy items (.items-${SPACE} list_id=${LIST2}): ${(await countListItems(LIST2)).toLocaleString()}`);
  log(`  list1 lookup index (${l1.lookupIndex}): ${(await countDocs(l1.lookupIndex)).toLocaleString()} docs`);
  log(`  list2 lookup index (${l2.lookupIndex}): ${(await countDocs(l2.lookupIndex)).toLocaleString()} docs`);
  log(`  events (${EVENTS_INDEX}): ${(await countDocs(EVENTS_INDEX)).toLocaleString()} docs`);

  log(`\nNew Terms rule execution:`);
  if (summary) {
    log(`  status:                 ${summary.status}`);
    log(`  wall time (run_soon->done): ${wallMs} ms`);
    log(`  summary metrics: ${JSON.stringify(summary.metrics ?? {})}`);
    if (summary.message) log(`  message: ${summary.message.slice(0, 200)}`);
  } else {
    log(`  ! no execution summary captured within the poll window (rule may still be running)`);
  }
  if (execEvent) {
    log(`  execution results API:`);
    log(`    total duration_ms:   ${execEvent.duration_ms ?? 'n/a'}`);
    log(`    search_duration_ms:  ${execEvent.search_duration_ms ?? 'n/a'}   <-- compare with ES|QL took`);
    log(`    indexing_duration_ms:${execEvent.indexing_duration_ms ?? 'n/a'}`);
    log(`    schedule_delay_ms:   ${execEvent.schedule_delay_ms ?? 'n/a'}`);
  }

  log(`\nES|QL query execution (INLINE STATS + LOOKUP JOIN against the lookup indices):`);
  if (esqlResult?.error) {
    log(`  ! ES|QL error: ${JSON.stringify(esqlResult.error).slice(0, 400)}`);
  } else if (esqlResult) {
    log(`  took (3 runs): ${esqlResult.tooks.join(', ')} ms  (best ${Math.min(...esqlResult.tooks)} ms)`);
    log(`  result: ${JSON.stringify(esqlResult.last?.values ?? [])}`);
  }

  log(`\n--------- ES|QL query (run this yourself) ---------\n`);
  log(query);
  log(`\n---------------------------------------------------`);

  log(`\nCaveats:`);
  log(`  - The rule reads the legacy value list (.items data stream); the ES|QL query joins the`);
  log(`    parallel lookup-mode indices. Both hold the same ${LIST_SIZE.toLocaleString()} values, so this compares the`);
  log(`    two storage+execution models over identical membership.`);
  log(`  - The ES|QL query approximates the rule: INLINE STATS gives "new terms" (username whose`);
  log(`    first occurrence in the window is inside the current interval); the two LOOKUP JOINs`);
  log(`    apply the exceptions (field_a NOT in list1 AND field_b in list2).`);
  log(`  - The rule additionally builds alerts and dedups per new term; the ES|QL ends in STATS`);
  log(`    to force full evaluation without returning every row.`);
  log(`  - total_search_duration_ms is ES search time inside the rule; ES|QL took is end-to-end`);
  log(`    query time. Compare them as orders of magnitude, not to the millisecond.`);
  log(`\nData left in place. Re-run to re-measure (generation is skipped when counts already match).`);
};

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
