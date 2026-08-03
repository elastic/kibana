/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const path = require('path');
const { performance, PerformanceObserver, constants } = require('perf_hooks');
const { isMainThread } = require('node:worker_threads');

const MONITOR_KEY = '__KBN_BENCH_MONITOR';
const FORCED_GC_REQUEST_FILE = 'forced_gc_request.json';

(() => {
  // Worker-thread isolates share a PID and are intentionally outside this monitor's scope.
  if (!isMainThread) {
    return;
  }

  const dir = process.env.KBN_BENCH_MONITOR_DIR;
  const interval = Number(process.env.KBN_BENCH_MONITOR_INTERVAL ?? 250);
  if (global[MONITOR_KEY]) {
    global[MONITOR_KEY]?.stop();
    global[MONITOR_KEY] = undefined;
  }

  if (!dir) {
    return;
  }

  const pid = process.pid;
  const argv = process.argv;
  const cpuStart = process.cpuUsage();
  const file = path.join(dir, `${pid}.ndjson`);
  const stream = fs.createWriteStream(file, { flags: 'w' });
  const stopFile = path.join(dir, 'stop');
  const forcedGcRequestFile = path.join(dir, FORCED_GC_REQUEST_FILE);
  let stopped = false;
  let forcedGcRequested = false;

  const gcDurations = {
    [constants.NODE_PERFORMANCE_GC_MAJOR]: 0,
    [constants.NODE_PERFORMANCE_GC_MINOR]: 0,
    [constants.NODE_PERFORMANCE_GC_INCREMENTAL]: 0,
    [constants.NODE_PERFORMANCE_GC_WEAKCB]: 0,
  };

  const gcObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const kind = entry.detail && entry.detail.kind != null ? entry.detail.kind : entry.kind;
      if (gcDurations[kind] != null) {
        gcDurations[kind] += entry.duration;
      }
    }
  });
  gcObserver.observe({ entryTypes: ['gc'], buffered: true });

  function writeSample() {
    const now = Date.now();
    const curCpuUsage = process.cpuUsage(cpuStart);
    const cpuUsage = (curCpuUsage.user || 0) + (curCpuUsage.system || 0);
    const rssMax = process.resourceUsage().maxRSS * 1024;
    const mem = process.memoryUsage();
    const gcMajor = gcDurations[constants.NODE_PERFORMANCE_GC_MAJOR] || 0;
    const gcMinor = gcDurations[constants.NODE_PERFORMANCE_GC_MINOR] || 0;
    const gcIncremental = gcDurations[constants.NODE_PERFORMANCE_GC_INCREMENTAL] || 0;
    const gcWeakCb = gcDurations[constants.NODE_PERFORMANCE_GC_WEAKCB] || 0;

    stream.write(
      `${JSON.stringify({
        pid,
        argv,
        time: now,
        cpuUsage: cpuUsage / 1000,
        rss: mem.rss,
        rssMax,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
        heapUsage: mem.heapUsed / mem.heapTotal,
        gcMajor,
        gcMinor,
        gcIncremental,
        gcWeakCb,
        gcTotal: gcMajor + gcMinor + gcIncremental + gcWeakCb,
      })}\n`
    );
  }

  const post = (session, method) =>
    new Promise((resolve, reject) => {
      session.post(method, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });

  const serializeError = (error) => ({
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
  });

  const keyHeapSpaces = (heapSpaces) =>
    Object.fromEntries(heapSpaces.map((space) => [space.space_name, space]));

  async function collectForcedGcHeapStats(request) {
    const startedAt = new Date().toISOString();
    const result = {
      requestId: request.requestId,
      pid,
      argv,
      requestedAt: request.requestedAt,
      startedAt,
      completedAt: startedAt,
      nodeVersion: process.versions.node,
      v8Version: process.versions.v8,
    };
    let session;

    try {
      const { Session } = require('node:inspector');
      const v8 = require('node:v8');
      session = new Session();
      const connectionStart = performance.now();
      session.connect();
      result.inspectorConnectionDurationMs = performance.now() - connectionStart;
      await post(session, 'HeapProfiler.enable');

      const preForcedGcHeapUsage = await post(session, 'Runtime.getHeapUsage');
      result.preForcedGcHeapUsage = preForcedGcHeapUsage;
      result.preForcedGcHeapUsed = preForcedGcHeapUsage.usedSize;

      const forcedGcStart = performance.now();
      await post(session, 'HeapProfiler.collectGarbage');
      result.forcedGcDurationMs = performance.now() - forcedGcStart;

      const postForcedGcHeapUsage = await post(session, 'Runtime.getHeapUsage');
      result.postForcedGcHeapUsage = postForcedGcHeapUsage;
      result.postForcedGcHeapUsed = postForcedGcHeapUsage.usedSize;
      result.forcedGcHeapReduction = result.preForcedGcHeapUsed - result.postForcedGcHeapUsed;
      result.postForcedGcMemoryUsage = process.memoryUsage();
      result.postForcedGcHeapStatistics = v8.getHeapStatistics();
      result.postForcedGcHeapSpaceStatistics = keyHeapSpaces(v8.getHeapSpaceStatistics());
      await post(session, 'HeapProfiler.disable');
    } catch (error) {
      result.error = serializeError(error);
    } finally {
      session?.disconnect();
      result.completedAt = new Date().toISOString();
    }

    const resultPath = path.join(dir, `${pid}.forced_gc.json`);
    const temporaryResultPath = `${resultPath}.${request.requestId}.tmp`;
    await fs.promises.writeFile(temporaryResultPath, `${JSON.stringify(result)}\n`, 'utf8');
    await fs.promises.rename(temporaryResultPath, resultPath);
  }

  async function handleForcedGcRequest() {
    if (forcedGcRequested) {
      return;
    }
    const request = JSON.parse(await fs.promises.readFile(forcedGcRequestFile, 'utf8'));
    if (!request.expectedPids.includes(pid)) {
      return;
    }
    forcedGcRequested = true;
    await freezeNaturalSampling();
    await collectForcedGcHeapStats(request);
  }

  const timer = setInterval(() => {
    try {
      if (fs.existsSync(stopFile)) {
        stop();
        return;
      }
      if (fs.existsSync(forcedGcRequestFile)) {
        void handleForcedGcRequest().catch(() => {});
        return;
      }
    } catch (_) {
      // Ignore transient monitor control-file errors; the next interval retries.
    }
    writeSample();
  }, interval).unref();

  function freezeNaturalSampling() {
    if (stopped) {
      return Promise.resolve();
    }
    stopped = true;
    clearInterval(timer);
    gcObserver.disconnect();
    process.off('exit', stop);
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    return new Promise((resolve) => stream.end(resolve));
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    stream.end();
    gcObserver.disconnect();
    process.off('exit', stop);
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }

  process.on('exit', stop);
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  global[MONITOR_KEY] = { stop };
})();
