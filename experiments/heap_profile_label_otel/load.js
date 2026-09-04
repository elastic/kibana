#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Concurrent load against the Task Manager heap-profile experiment routes.
 * No extra dependencies; uses Node fetch.
 */

const LIGHT_PATH = '/api/task_manager/_heap_profile_experiment/light';
const HEAVY_PATH = '/api/task_manager/_heap_profile_experiment/heavy';

const usage = () => {
  console.error(`Usage: node experiments/heap_profile_label_otel/load.js --base-url URL [options]

  --base-url        Kibana origin (required)
  --api-key         ApiKey token (or env KBN_API_KEY)
  --light N         light requests per batch (default 100)
  --heavy M         heavy requests per batch (default 1)
  --latency ms      applied to both routes
  --heavy-bytes     bytes query for the heavy route
  --light-bytes     bytes query for the light route
  --concurrency     max in-flight requests (default = batch size)
  --repeat          times to run the batch (default 1)
`);
};

const parseArgs = (argv) => {
  const opts = {
    baseUrl: undefined,
    apiKey: process.env.KBN_API_KEY,
    light: 100,
    heavy: 1,
    latency: undefined,
    heavyBytes: undefined,
    lightBytes: undefined,
    concurrency: undefined,
    repeat: 1,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    const takeNumber = () => {
      i += 1;
      return Number(next);
    };
    switch (arg) {
      case '--base-url':
        opts.baseUrl = next;
        i += 1;
        break;
      case '--api-key':
        opts.apiKey = next;
        i += 1;
        break;
      case '--light':
        opts.light = takeNumber();
        break;
      case '--heavy':
        opts.heavy = takeNumber();
        break;
      case '--latency':
        opts.latency = takeNumber();
        break;
      case '--heavy-bytes':
        opts.heavyBytes = takeNumber();
        break;
      case '--light-bytes':
        opts.lightBytes = takeNumber();
        break;
      case '--concurrency':
        opts.concurrency = takeNumber();
        break;
      case '--repeat':
        opts.repeat = takeNumber();
        break;
      case '-h':
      case '--help':
        usage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!opts.baseUrl) {
    usage();
    throw new Error('--base-url is required');
  }
  return opts;
};

const buildUrl = (baseUrl, path, query) => {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
};

const runPool = async (jobs, concurrency, worker) => {
  const results = new Array(jobs.length);
  let next = 0;
  const workerLoop = async () => {
    while (next < jobs.length) {
      const index = next;
      next += 1;
      results[index] = await worker(jobs[index]);
    }
  };
  const n = Math.max(1, Math.min(concurrency, jobs.length || 1));
  await Promise.all(Array.from({ length: n }, () => workerLoop()));
  return results;
};

const summarize = (label, results) => {
  const statuses = new Map();
  const elapsed = [];
  const failures = [];
  for (const row of results) {
    const key = String(row.status);
    statuses.set(key, (statuses.get(key) ?? 0) + 1);
    if (typeof row.elapsedMs === 'number' && Number.isFinite(row.elapsedMs)) {
      elapsed.push(row.elapsedMs);
    }
    if (!row.ok) {
      failures.push(row);
    }
  }
  const statusText = [...statuses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, count]) => `${code}=${count}`)
    .join(' ');
  let elapsedText = 'n/a';
  if (elapsed.length > 0) {
    const min = Math.min(...elapsed);
    const max = Math.max(...elapsed);
    const avg = elapsed.reduce((sum, value) => sum + value, 0) / elapsed.length;
    elapsedText = `min=${min.toFixed(1)} avg=${avg.toFixed(1)} max=${max.toFixed(1)}`;
  }
  console.log(label);
  console.log(`  status: ${statusText || 'none'}`);
  console.log(`  elapsedMs: ${elapsedText}`);
  if (failures.length > 0) {
    console.log('  failures:');
    for (const failure of failures) {
      console.log(`    ${failure.status} ${failure.url} ${failure.error ?? ''}`.trimEnd());
    }
  }
};

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  const headers = { accept: 'application/json' };
  if (opts.apiKey) {
    headers.authorization = `ApiKey ${opts.apiKey}`;
  }

  const jobs = [];
  for (let i = 0; i < opts.light; i++) {
    jobs.push({
      kind: 'light',
      url: buildUrl(opts.baseUrl, LIGHT_PATH, { latency: opts.latency, bytes: opts.lightBytes }),
    });
  }
  for (let i = 0; i < opts.heavy; i++) {
    jobs.push({
      kind: 'heavy',
      url: buildUrl(opts.baseUrl, HEAVY_PATH, {
        latency: opts.latency,
        bytes: opts.heavyBytes,
      }),
    });
  }
  const concurrency = opts.concurrency ?? jobs.length;

  const all = [];
  for (let round = 0; round < opts.repeat; round++) {
    const batch = await runPool(jobs, concurrency, async (job) => {
      const started = performance.now();
      try {
        const response = await fetch(job.url, { headers });
        const elapsedMs = performance.now() - started;
        if (!response.ok) {
          const text = await response.text();
          return {
            kind: job.kind,
            url: job.url.href,
            status: response.status,
            ok: false,
            elapsedMs,
            error: text.slice(0, 200),
          };
        }
        const body = await response.json();
        return {
          kind: job.kind,
          url: job.url.href,
          status: response.status,
          ok: true,
          elapsedMs: typeof body.elapsedMs === 'number' ? body.elapsedMs : elapsedMs,
        };
      } catch (err) {
        return {
          kind: job.kind,
          url: job.url.href,
          status: 'error',
          ok: false,
          elapsedMs: performance.now() - started,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });
    all.push(...batch);
  }

  summarize(
    `GET ${LIGHT_PATH}`,
    all.filter((row) => row.kind === 'light')
  );
  summarize(
    `GET ${HEAVY_PATH}`,
    all.filter((row) => row.kind === 'heavy')
  );
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
