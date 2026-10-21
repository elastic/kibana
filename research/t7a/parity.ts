/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */
/* RESEARCH ONLY (Track 7.A). Replays the Tier-B alerting rule once and dumps normalised outputs.
 *
 * usage:
 *   node research/t7a/parity.ts seed
 *   node research/t7a/parity.ts run <label> <outDir>       # create connector+rule, wait, dump
 *   node research/t7a/parity.ts diff <a.json> <b.json>
 * env: T7A_KBN (http://localhost:5675), T7A_ES (http://localhost:9275), T7A_AUTH (elastic:changeme)
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { createRequire } from 'module';

const lz = createRequire(import.meta.url)('lz-string') as {
  decompressFromBase64: (s: string) => string | null;
};

const KBN = process.env.T7A_KBN ?? 'http://localhost:5675';
const ES = process.env.T7A_ES ?? 'http://localhost:9275';
const AUTH = 'Basic ' + Buffer.from(process.env.T7A_AUTH ?? 'elastic:changeme').toString('base64');
const WIDE = 'wir-alerting-wide';
const OUT_INDEX = 'wir-alert-actions';
const ROWS = Number(process.env.T7A_ROWS ?? 1000);
const FIELDS = 100;
const SEED_TS = process.env.T7A_SEED_TS ?? '2026-10-20T06:00:00.000Z';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const call = async (
  base: string,
  method: string,
  path: string,
  body?: unknown,
  ndjson = false
): Promise<{ status: number; body: any }> => {
  const res = await fetch(base + path, {
    method,
    headers: {
      authorization: AUTH,
      'kbn-xsrf': 't7a',
      'x-elastic-internal-origin': 'Kibana',
      'content-type': ndjson ? 'application/x-ndjson' : 'application/json',
    },
    body: body === undefined ? undefined : ndjson ? (body as string) : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed };
};
const must = <T>(r: { status: number; body: T }, what: string): T => {
  if (r.status >= 300)
    throw new Error(`${what}: ${r.status} ${JSON.stringify(r.body).slice(0, 500)}`);
  return r.body;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const seed = async () => {
  await call(ES, 'DELETE', `/${WIDE}?ignore_unavailable=true`);
  must(
    await call(ES, 'PUT', `/${WIDE}`, {
      settings: { 'index.mapping.total_fields.limit': FIELDS + 1000, number_of_shards: 1 },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          'host.name': { type: 'keyword' },
          ...Object.fromEntries(
            Array.from({ length: FIELDS }, (_, f) => [`attr_${f}`, { type: 'keyword' }])
          ),
        },
      },
    }),
    'create wide'
  );
  const lines: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    const doc: Record<string, unknown> = { '@timestamp': SEED_TS, 'host.name': `host-${r}` };
    for (let f = 0; f < FIELDS; f++)
      doc[`attr_${f}`] = `value-${r}-${f}-lorem-ipsum-dolor-sit-amet`;
    lines.push(JSON.stringify({ index: { _index: WIDE, _id: `row-${r}` } }), JSON.stringify(doc));
  }
  must(await call(ES, 'POST', '/_bulk?refresh=true', lines.join('\n') + '\n', true), 'bulk');
  console.log(`seeded ${ROWS} rows @ ${SEED_TS}`);
};

const searchAll = async (index: string, query: unknown, sort: unknown[] = ['_doc']) => {
  const hits: any[] = [];
  let searchAfter: unknown[] | undefined;
  for (;;) {
    const r = must(
      await call(ES, 'POST', `/${index}/_search`, {
        size: 1000,
        query,
        sort,
        ...(searchAfter ? { search_after: searchAfter } : {}),
      }),
      `search ${index}`
    );
    const page = r.hits.hits as any[];
    hits.push(...page);
    if (page.length < 1000) break;
    searchAfter = page[page.length - 1].sort;
  }
  return hits;
};

const awaitDrained = async (timeoutMs: number) => {
  const t0 = Date.now();
  for (;;) {
    const r = must(
      await call(ES, 'POST', '/.kibana_task_manager/_count', {
        query: { bool: { filter: [{ term: { 'task.taskType': 'actions:.index' } }] } },
      }),
      'count tasks'
    );
    if (r.count === 0) return Date.now() - t0;
    if (Date.now() - t0 > timeoutMs) throw new Error(`actions not drained: ${r.count}`);
    await sleep(1000);
  }
};

/** Replaces run-specific identifiers/timestamps with stable placeholders, deterministically. */
const normaliser = (ids: Record<string, string>) => {
  const uuidMap = new Map<string, string>();
  const uuidRe = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g;
  const isoRe = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g;
  const replaceStr = (s: string): string => {
    // share's redirect URLs carry lz-string *base64* of the locator params (format_search_params.ts).
    let out = s.replace(/lz=([A-Za-z0-9%+/=]+)/g, (_m, enc: string) => {
      const decoded = lz.decompressFromBase64(decodeURIComponent(enc));
      return `lz=<${decoded ?? 'UNDECODABLE'}>`;
    });
    for (const [name, value] of Object.entries(ids))
      if (value) out = out.split(value).join(`<${name}>`);
    out = out.replace(isoRe, (m) => (m === SEED_TS ? '<SEED_TS>' : '<TS>'));
    out = out.replace(uuidRe, (m) => {
      if (!uuidMap.has(m)) uuidMap.set(m, `<uuid>`);
      return uuidMap.get(m)!;
    });
    return out;
  };
  const walk = (v: Json): Json => {
    if (typeof v === 'string') return replaceStr(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o: Record<string, Json> = {};
      for (const k of Object.keys(v).sort()) o[replaceStr(k)] = walk(v[k]);
      return o;
    }
    return v;
  };
  return walk;
};

const drop = (o: any, paths: string[]) => {
  for (const p of paths) {
    const parts = p.split('.');
    // flattened keys (AAD uses dotted keys)
    if (p in o) delete o[p];
    let cur = o;
    for (let i = 0; i < parts.length - 1 && cur; i++) cur = cur[parts[i]];
    if (cur && typeof cur === 'object') delete cur[parts[parts.length - 1]];
  }
  return o;
};

const digest = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');

const run = async (label: string, outDir: string) => {
  mkdirSync(outDir, { recursive: true });
  const tag = `t7a-${label}-${Date.now().toString(36)}`;
  const connector = must(
    await call(KBN, 'POST', '/api/actions/connector', {
      name: `wir-index-${tag}`,
      connector_type_id: '.index',
      config: { index: OUT_INDEX, refresh: false },
    }),
    'create connector'
  );
  const template = {
    run_id: tag,
    rule: '{{rule.name}}',
    alert: '{{alert.id}}',
    message: '{{context.message}}',
    hits: '{{context.hits}}',
    context: '{{context}}',
  };
  const t0 = Date.now();
  const rule = must(
    await call(KBN, 'POST', '/api/alerting/rule', {
      name: `wir-esql-wide-${tag}`,
      consumer: 'stackAlerts',
      rule_type_id: '.es-query',
      schedule: { interval: '1h' },
      enabled: true,
      params: {
        searchType: 'esqlQuery',
        esqlQuery: { esql: `FROM ${WIDE} | LIMIT ${ROWS}` },
        timeField: '@timestamp',
        timeWindowSize: 24,
        timeWindowUnit: 'h',
        threshold: [0],
        thresholdComparator: '>',
        size: 100,
        groupBy: 'row',
        sourceFields: [],
      },
      actions: [0, 1].map(() => ({
        id: connector.id,
        group: 'query matched',
        params: { documents: [template] },
        frequency: { summary: false, notify_when: 'onActiveAlert', throttle: null },
      })),
    }),
    'create rule'
  );
  let status: any = {};
  for (let i = 0; i < 300; i++) {
    await sleep(1000);
    status = (await call(KBN, 'GET', `/api/alerting/rule/${rule.id}`)).body;
    if (status?.last_run?.outcome || status?.execution_status?.status === 'error') break;
  }
  const ruleMs = Date.now() - t0;
  const drainMs = await awaitDrained(900_000);
  const totalMs = Date.now() - t0;
  // Event log + action docs are written asynchronously (buffered); wait until counts are stable.
  let last = '';
  for (let i = 0; i < 60; i++) {
    await call(ES, 'POST', `/${OUT_INDEX},.alerts-*,.kibana-event-log-*/_refresh`);
    const ev = (
      await call(ES, 'POST', '/.kibana-event-log-*/_count', {
        query: {
          nested: {
            path: 'kibana.saved_objects',
            query: { terms: { 'kibana.saved_objects.id': [rule.id, connector.id] } },
          },
        },
      })
    ).body.count;
    const docs = (
      await call(ES, 'POST', `/${OUT_INDEX}/_count`, { query: { term: { 'run_id.keyword': tag } } })
    ).body.count;
    const now = `${ev}/${docs}`;
    if (now === last) break;
    last = now;
    await sleep(3000);
  }

  const ids: Record<string, string> = {
    RULE_ID: rule.id,
    CONNECTOR_ID: connector.id,
    TASK_ID: status.scheduled_task_id ?? '',
    TAG: tag,
  };
  const norm = normaliser(ids);

  // 1. rule SO (API view)
  const ruleView = drop(JSON.parse(JSON.stringify(status)), [
    'updated_at',
    'created_at',
    'execution_status.last_execution_date',
    'execution_status.last_duration',
    'last_run.alerts_count',
    'next_run',
    'api_key_owner',
    'api_key_created_by_user',
    'revision',
    'monitoring',
  ]);
  ruleView.alerts_count = status.last_run?.alerts_count;
  ruleView.monitoring_last_run_metrics = drop(
    JSON.parse(JSON.stringify(status.monitoring?.run?.last_run?.metrics ?? {})),
    ['total_search_duration_ms', 'total_indexing_duration_ms', 'gap_duration_s', 'duration']
  );

  // 2. TM task state for the rule
  const task = must(
    await call(ES, 'GET', `/.kibana_task_manager/_doc/task:${status.scheduled_task_id}`),
    'get task'
  )._source.task;
  const taskState = JSON.parse(task.state);
  drop(taskState, ['previousStartedAt', 'summaryActions']);
  for (const a of Object.values(taskState.alertInstances ?? {}) as any[]) {
    drop(a, ['meta.lastScheduledActions.date', 'state.start', 'state.duration']);
  }
  for (const a of Object.values(taskState.alertRecoveredInstances ?? {}) as any[])
    drop(a, ['meta.lastScheduledActions.date', 'state.start', 'state.end', 'state.duration']);
  const taskView = { status: task.status, attempts: task.attempts, state: taskState };

  // 3. AAD docs
  const aad = (
    await searchAll('.alerts-stack.alerts-default', {
      term: { 'kibana.alert.rule.uuid': rule.id },
    })
  ).map((h) =>
    drop({ ...h._source }, [
      '@timestamp',
      'kibana.alert.start',
      'kibana.alert.time_range',
      'kibana.alert.duration.us',
      'kibana.alert.uuid',
      'kibana.alert.rule.execution.uuid',
      'kibana.alert.rule.execution.timestamp',
      'kibana.version',
      'event.created',
    ])
  );

  // 4. action output docs
  const outDocs = (await searchAll(OUT_INDEX, { term: { 'run_id.keyword': tag } })).map(
    (h) => h._source
  );

  // 5. event log (rule + connector)
  const events = (
    await searchAll(
      '.kibana-event-log-*',
      {
        nested: {
          path: 'kibana.saved_objects',
          query: { terms: { 'kibana.saved_objects.id': [rule.id, connector.id] } },
        },
      },
      ['_doc']
    )
  ).map((h) =>
    drop({ ...h._source }, [
      '@timestamp',
      'event.start',
      'event.end',
      'event.duration',
      'kibana.server_uuid',
      'kibana.task.scheduled',
      'kibana.task.schedule_delay',
      'kibana.task.id',
      'kibana.alert.rule.execution.metrics',
      'kibana.alert.rule.execution.uuid',
      'kibana.alert.rule.execution.backfill',
      'kibana.alerting.instance_id',
      'kibana.action.execution.uuid',
      'kibana.action.execution.usage',
      'kibana.alert.uuid',
      'ecs.version',
      'kibana.version',
      'message',
      'rule.version',
    ])
  );
  const eventMessages = events.map((e: any) => e.message);

  // 6. leftovers
  const leftoverParams = must(
    await call(ES, 'POST', '/.kibana_alerting_cases/_count', {
      query: { term: { type: 'action_task_params' } },
    }),
    'count params'
  ).count;
  const failedTasks = must(
    await call(ES, 'POST', '/.kibana_task_manager/_count', {
      query: { bool: { filter: [{ prefix: { 'task.taskType': 'actions:' } }] } },
    }),
    'count failed'
  ).count;

  const sortCanon = (arr: Json[]) =>
    arr
      .map((x) => norm(x as Json))
      .sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));

  const eventSummary = (() => {
    const counts: Record<string, number> = {};
    for (const e of events as any[]) {
      const k = `${e.event?.provider}/${e.event?.action}/${e.event?.outcome ?? '-'}`;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : 1)));
  })();

  const result = {
    label,
    tag,
    timings_ms: { rule: ruleMs, drain: drainMs, total: totalMs },
    counts: {
      aad: aad.length,
      action_docs: outDocs.length,
      events: events.length,
      leftover_action_task_params: leftoverParams,
      leftover_action_tasks: failedTasks,
    },
    event_summary: eventSummary,
    rule: norm(ruleView as Json),
    task: norm(taskView as Json),
    aad: sortCanon(aad as Json[]),
    action_docs: sortCanon(outDocs as Json[]),
    events: sortCanon(events as Json[]),
  };
  const digests = Object.fromEntries(
    ['rule', 'task', 'aad', 'action_docs', 'events'].map((k) => [k, digest((result as any)[k])])
  );
  writeFileSync(
    join(outDir, `parity-${label}.json`),
    JSON.stringify({ ...result, digests }, null, 1)
  );
  console.log(
    JSON.stringify({
      label,
      timings_ms: result.timings_ms,
      counts: result.counts,
      event_summary: eventSummary,
      digests,
      eventMessagesSample: eventMessages.slice(0, 0),
    })
  );
  await call(KBN, 'POST', `/api/alerting/rule/${rule.id}/_disable`);
};

const diff = (a: string, b: string) => {
  const A = JSON.parse(readFileSync(a, 'utf8'));
  const B = JSON.parse(readFileSync(b, 'utf8'));
  const report: Record<string, unknown> = {};
  const canon = (v: unknown) =>
    JSON.stringify(v, (_k, x) =>
      x && typeof x === 'object' && !Array.isArray(x)
        ? Object.fromEntries(Object.entries(x).sort(([left], [right]) => (left < right ? -1 : 1)))
        : x
    );
  for (const k of ['counts', 'event_summary'])
    report[k] = canon(A[k]) === canon(B[k]) ? 'equal' : { a: A[k], b: B[k] };
  const short = (v: unknown) => JSON.stringify(v).slice(0, 400);
  // Leaf-path diff of two values (first N differences), so huge documents stay readable.
  const leafDiffs = (x: any, y: any, path = '', out: string[] = []): string[] => {
    if (out.length > 8) return out;
    if (JSON.stringify(x) === JSON.stringify(y)) return out;
    if (
      x &&
      y &&
      typeof x === 'object' &&
      typeof y === 'object' &&
      !Array.isArray(x) &&
      !Array.isArray(y)
    ) {
      for (const key of new Set([...Object.keys(x), ...Object.keys(y)]))
        leafDiffs(x[key], y[key], `${path}.${key}`, out);
      return out;
    }
    if (typeof x === 'string' && typeof y === 'string') {
      let i = 0;
      while (i < x.length && x[i] === y[i]) i++;
      out.push(
        `${path}: @${i} a=${JSON.stringify(
          x.slice(Math.max(0, i - 60), i + 80)
        )} b=${JSON.stringify(y.slice(Math.max(0, i - 60), i + 80))}`
      );
      return out;
    }
    out.push(`${path}: a=${short(x)} b=${short(y)}`);
    return out;
  };
  for (const k of ['rule', 'task', 'aad', 'action_docs', 'events']) {
    if (A.digests[k] === B.digests[k]) {
      report[k] = 'equal';
      continue;
    }
    if (Array.isArray(A[k]) && Array.isArray(B[k])) {
      const ca = new Map<string, number>();
      for (const x of A[k]) ca.set(JSON.stringify(x), (ca.get(JSON.stringify(x)) ?? 0) + 1);
      const onlyB: any[] = [];
      for (const x of B[k]) {
        const s = JSON.stringify(x);
        const n = ca.get(s) ?? 0;
        if (n > 0) ca.set(s, n - 1);
        else onlyB.push(x);
      }
      const onlyA: any[] = [];
      for (const [s, n] of ca) for (let i = 0; i < n; i++) onlyA.push(JSON.parse(s));
      report[k] = {
        onlyA: onlyA.length,
        onlyB: onlyB.length,
        firstPairDiffs: onlyA.length && onlyB.length ? leafDiffs(onlyA[0], onlyB[0]) : undefined,
      };
    } else report[k] = { leafDiffs: leafDiffs(A[k], B[k]) };
  }
  console.log(JSON.stringify(report, null, 1));
};

const [cmd, ...args] = process.argv.slice(2);
(async () => {
  if (cmd === 'seed') await seed();
  else if (cmd === 'run') await run(args[0], args[1]);
  else if (cmd === 'diff') diff(args[0], args[1]);
  else throw new Error('usage: seed | run <label> <outDir> | diff <a> <b>');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
