/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Production-shape memory driver. Talks to a Kibana that is already up.
 * Correctness/memory only: does not take bench.lock.
 *
 * Pre-registration must already exist at PREREG. This script does not edit it.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mixBytes, percentile, scaleFamily, slotsThatFit, GIB } from './summarize_memory.mjs';

const KBN = process.env.T7P_KBN ?? 'http://127.0.0.1:5681';
const AUTH = `Basic ${Buffer.from(process.env.T7P_AUTH ?? 'elastic:changeme').toString('base64')}`;
const PREREG = process.env.T7P_PREREG;
const OUT = process.env.T7P_OUT;
const COLD_N = Number(process.env.T7P_COLD_N ?? 20);
const WARM_N = Number(process.env.T7P_WARM_N ?? 20);
const RULE_ID = process.env.T7P_RULE_ID ?? '';

const PODS = [
  { id: 'default-background-tasks', limitBytes: 2 * GIB, heapCapMiB: 1638 },
  { id: 'security-background-tasks', limitBytes: 4 * GIB, heapCapMiB: 3277 },
];

const TRACK4_PC_HEAP = {
  alerting: 142 * 1024 * 1024,
  workflow: 92 * 1024 * 1024,
  agent: 74 * 1024 * 1024,
};

const call = async (method, path, body) => {
  const res = await fetch(KBN + path, {
    method,
    headers: {
      authorization: AUTH,
      'kbn-xsrf': 't7p-prod-shape',
      'x-elastic-internal-origin': 'Kibana',
      'content-type': 'application/json',
      'elastic-api-version': '1',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  if (res.status >= 300) {
    const message = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    throw new Error(`${method} ${path}: ${res.status} ${message.slice(0, 800)}`);
  }
  return parsed;
};

const info = () => call('GET', '/internal/workload_isolation_research/info');
const configure = (body) => call('POST', '/internal/workload_isolation_research/t7a/config', body);
const probe = (kind) => call('POST', '/internal/workload_isolation_research/t7a/probe', { kind });

const valueOf = (outcome) => outcome?.value ?? outcome;

const slotVerdict = (slots) => {
  if (slots === 0) return 'doesnt-fit';
  if (Number.isFinite(slots)) return `fits-with-${slots}-slots`;
  return 'fits';
};

const summarize = (samples) => {
  const cold = samples.cold.map((row) => row.coldStartMs);
  const warm = samples.warm.map((row) => row.waitedMs);
  const one = samples.oneGc;
  const main = samples.mainOnly.main_memory;
  const islandHeap = one.memory.heapUsed;
  const rssDelta = samples.afterOne.main_memory.rss - main.rss;
  const perClassHeap = {
    alerting: islandHeap,
    workflow: scaleFamily(TRACK4_PC_HEAP.workflow, TRACK4_PC_HEAP.alerting, islandHeap),
    agent: scaleFamily(TRACK4_PC_HEAP.agent, TRACK4_PC_HEAP.alerting, islandHeap),
  };
  const perClassRss = {
    alerting: rssDelta,
    workflow: scaleFamily(TRACK4_PC_HEAP.workflow, TRACK4_PC_HEAP.alerting, rssDelta),
    agent: scaleFamily(TRACK4_PC_HEAP.agent, TRACK4_PC_HEAP.alerting, rssDelta),
  };
  const pods = PODS.map((pod) => {
    const n = slotsThatFit(main.rss, rssDelta, pod.limitBytes);
    const mix631 = mixBytes('6/3/1', perClassRss);
    const mix221 = mixBytes('2/2/1', perClassRss);
    return {
      pod: pod.id,
      limitBytes: pod.limitBytes,
      heapCapMiB: pod.heapCapMiB,
      alertingSlotsThatFit: n,
      verdict: slotVerdict(n),
      mix631Rss: mix631 == null ? null : main.rss + mix631,
      mix221Rss: mix221 == null ? null : main.rss + mix221,
      mix631Fits: mix631 == null ? null : main.rss + mix631 <= pod.limitBytes,
      mix221Fits: mix221 == null ? null : main.rss + mix221 <= pod.limitBytes,
    };
  });
  return {
    coldP50Ms: percentile(cold, 50),
    coldP95Ms: percentile(cold, 95),
    coldLe5sP95: percentile(cold, 95) <= 5000,
    warmP50Ms: percentile(warm, 50),
    warmP95Ms: percentile(warm, 95),
    oneIsland: one.memory,
    rssDelta,
    perClassHeap,
    perClassRss,
    pods,
    model:
      'workflow and agent heap/RSS are Track 4 PC uninitialised family bytes scaled by measured alerting / 142 MiB. Not a direct measurement of those islands.',
  };
};

const main = async () => {
  if (!PREREG || !OUT) throw new Error('T7P_PREREG and T7P_OUT are required');
  const prereg = JSON.parse(readFileSync(PREREG, 'utf8'));
  if (prereg.run_id !== 't7p-prod-shape-mem-001') throw new Error('unexpected prereg run_id');
  const mainOnly = await info();
  await configure({
    mode: 'offmain',
    transport: 'thread',
    slots: 1,
    concurrency: 1,
    localSo: true,
  });
  const cold = [];
  for (let i = 0; i < COLD_N; i++) {
    const row = await probe('coldstart');
    const value = valueOf(row);
    cold.push({
      i,
      coldStartMs: row.coldStartMs,
      bootMs: value.bootMs,
      waitedMs: value.waitedMs,
      memory: value.memory,
      pointerCompression: value.memory?.pointerCompression,
    });
  }
  const warm = [];
  for (let i = 0; i < WARM_N; i++) {
    const t0 = performance.now();
    const row = await probe('boot');
    const value = valueOf(row);
    warm.push({
      i,
      clientMs: performance.now() - t0,
      waitedMs: value.waitedMs,
      bootMs: value.bootMs,
    });
  }
  await probe('gc');
  const oneGc = valueOf(await probe('stats'));
  const afterOne = await info();
  const write = (payload) => {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload));
  };
  let load = null;
  if (RULE_ID) {
    try {
      const t0 = performance.now();
      const run = await call('POST', `/api/alerting/rule/${RULE_ID}/_run`, {});
      load = { ruleId: RULE_ID, ms: performance.now() - t0, body: run };
      await probe('gc');
    } catch (error) {
      load = { ruleId: RULE_ID, error: String(error).slice(0, 500) };
    }
  }
  const afterLoad = load && !load.error ? valueOf(await probe('stats')) : null;
  const oneIsland = {
    run_id: prereg.run_id,
    partial: 'one-island',
    at: new Date().toISOString(),
    mainOnly,
    cold,
    warm,
    oneGc,
    afterOne,
    load,
    afterLoad,
    summary: summarize({ mainOnly, cold, warm, oneGc, afterOne }),
  };
  write(oneIsland);
  if (process.env.T7P_SKIP_SLOTS === '1') {
    process.stdout.write(
      `one-island cold p50=${oneIsland.summary.coldP50Ms} p95=${oneIsland.summary.coldP95Ms} rssDelta=${oneIsland.summary.rssDelta}\n`
    );
    return;
  }
  await configure({ slots: 6, concurrency: 1 });
  const six = await Promise.all(Array.from({ length: 6 }, () => probe('boot')));
  await Promise.all(Array.from({ length: 6 }, () => probe('gc')));
  const afterSix = await info();
  const result = {
    run_id: prereg.run_id,
    prereg_sha_note: prereg.written_at,
    at: new Date().toISOString(),
    kibana: KBN,
    mainOnly,
    cold,
    warm,
    oneGc,
    afterOne,
    load,
    afterLoad,
    six: six.map((row) => ({ bootMs: valueOf(row).bootMs, memory: valueOf(row).memory })),
    afterSix,
    summary: summarize({ mainOnly, cold, warm, oneGc, afterOne }),
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(result));
  const podLine = result.summary.pods.map((pod) => `${pod.pod}=${pod.verdict}`).join(' ');
  process.stdout.write(
    `${podLine} cold p50=${result.summary.coldP50Ms} p95=${result.summary.coldP95Ms} rssDelta=${result.summary.rssDelta}\n`
  );
};

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exit(1);
});
