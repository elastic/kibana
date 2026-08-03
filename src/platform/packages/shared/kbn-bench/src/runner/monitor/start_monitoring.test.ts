/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ForcedGcHeapStats, ProcStatSample } from './types';
import { requestForcedGcHeapStats, startMonitoring } from './start_monitoring';

const log = {
  debug: jest.fn(),
  warning: jest.fn(),
} as unknown as ToolingLog;

const makeSample = (pid: number): ProcStatSample => ({
  pid,
  argv: ['node'],
  time: 1,
  cpuUsage: 1,
  rss: 2,
  rssMax: 3,
  heapUsed: 4,
  heapTotal: 5,
  external: 6,
  arrayBuffers: 7,
  heapUsage: 0.8,
  gcTotal: 0,
  gcMajor: 0,
  gcMinor: 0,
  gcIncremental: 0,
  gcWeakCb: 0,
  tailRss: 0,
  tailHeapUsed: 0,
  tailHeapTotal: 0,
  tailExternal: 0,
  tailArrayBuffers: 0,
});

const makeForcedGcResult = ({
  requestId,
  requestedAt,
  pid,
}: {
  requestId: string;
  requestedAt: string;
  pid: number;
}): ForcedGcHeapStats => ({
  requestId,
  pid,
  argv: ['node'],
  requestedAt,
  startedAt: requestedAt,
  completedAt: requestedAt,
  nodeVersion: '24.18.0',
  v8Version: '13.6',
  inspectorConnectionDurationMs: 1,
  forcedGcDurationMs: 10,
  preForcedGcHeapUsed: 100,
  postForcedGcHeapUsed: 50,
  forcedGcHeapReduction: 50,
  preForcedGcHeapUsage: {
    usedSize: 100,
    totalSize: 200,
    embedderHeapUsedSize: 1,
    backingStorageSize: 2,
  },
  postForcedGcHeapUsage: {
    usedSize: 50,
    totalSize: 200,
    embedderHeapUsedSize: 1,
    backingStorageSize: 2,
  },
  postForcedGcMemoryUsage: { heapUsed: 50 },
  postForcedGcHeapStatistics: { used_heap_size: 50 },
  postForcedGcHeapSpaceStatistics: {
    old_space: { space_name: 'old_space', space_used_size: 40 },
  },
});

describe('forced-GC monitor control', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kbn-bench-monitor-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('matches one structured result to its request and PID', async () => {
    const pid = 12345;
    const responder = setInterval(async () => {
      const requestPath = path.join(tempDir, 'forced_gc_request.json');
      if (!fs.existsSync(requestPath)) return;
      clearInterval(responder);
      const request = JSON.parse(await fs.promises.readFile(requestPath, 'utf8'));
      await fs.promises.writeFile(
        path.join(tempDir, `${pid}.forced_gc.json`),
        JSON.stringify(makeForcedGcResult({ ...request, pid })),
        'utf8'
      );
    }, 5);

    const results = await requestForcedGcHeapStats({
      monitorDir: tempDir,
      expectedPids: [pid],
      timeoutMs: 1_000,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({ pid, postForcedGcHeapUsed: 50, forcedGcHeapReduction: 50 })
    );
  });

  it('rejects a matching result that omits required probe fields', async () => {
    const pid = 12345;
    const responder = setInterval(async () => {
      const requestPath = path.join(tempDir, 'forced_gc_request.json');
      if (!fs.existsSync(requestPath)) return;
      clearInterval(responder);
      const request = JSON.parse(await fs.promises.readFile(requestPath, 'utf8'));
      const { postForcedGcHeapStatistics, ...incomplete } = makeForcedGcResult({ ...request, pid });
      expect(postForcedGcHeapStatistics).toBeDefined();
      await fs.promises.writeFile(
        path.join(tempDir, `${pid}.forced_gc.json`),
        JSON.stringify(incomplete),
        'utf8'
      );
    }, 5);

    const [result] = await requestForcedGcHeapStats({
      monitorDir: tempDir,
      expectedPids: [pid],
      timeoutMs: 1_000,
    });

    expect(result.error).toEqual(
      expect.objectContaining({
        name: 'ForcedGcHeapStatsValidationError',
        message: expect.stringContaining('postForcedGcHeapStatistics'),
      })
    );
  });

  it('returns a per-PID diagnostic rather than substituting data on timeout', async () => {
    const [result] = await requestForcedGcHeapStats({
      monitorDir: tempDir,
      expectedPids: [12345],
      timeoutMs: 1,
    });

    expect(result.error).toEqual(
      expect.objectContaining({ name: 'ForcedGcHeapStatsTimeoutError' })
    );
    expect(result.postForcedGcHeapUsed).toBeUndefined();
  });

  it('leaves forced-GC collection disabled unless stop explicitly requests it', async () => {
    const stopMonitoring = await startMonitoring({ dir: tempDir, log });
    const monitorDir = process.env.KBN_BENCH_MONITOR_DIR!;
    const pid = process.pid + 1;
    await fs.promises.writeFile(
      path.join(monitorDir, `${pid}.ndjson`),
      `${JSON.stringify(makeSample(pid))}\n`,
      'utf8'
    );

    const result = await stopMonitoring();

    expect(result.forcedGcHeapStats).toBeUndefined();
    expect(result.samples).toHaveLength(1);
    expect(result.stats[0].tailHeapUsed).toBe(4);
  });

  it('keeps forced-GC results separate from natural samples', async () => {
    const stopMonitoring = await startMonitoring({ dir: tempDir, log });
    const monitorDir = process.env.KBN_BENCH_MONITOR_DIR!;
    const pid = process.pid + 1;
    await fs.promises.writeFile(
      path.join(monitorDir, `${pid}.ndjson`),
      `${JSON.stringify(makeSample(pid))}\n`,
      'utf8'
    );
    const responder = setInterval(async () => {
      const requestPath = path.join(monitorDir, 'forced_gc_request.json');
      if (!fs.existsSync(requestPath)) return;
      clearInterval(responder);
      const request = JSON.parse(await fs.promises.readFile(requestPath, 'utf8'));
      await fs.promises.writeFile(
        path.join(monitorDir, `${pid}.forced_gc.json`),
        JSON.stringify(makeForcedGcResult({ ...request, pid })),
        'utf8'
      );
    }, 5);

    const result = await stopMonitoring({ collectForcedGcHeapStats: true });

    expect(result.samples).toHaveLength(1);
    expect(result.samples[0]).toHaveLength(1);
    expect(result.samples[0][0].heapUsed).toBe(4);
    expect(result.stats[0].tailHeapUsed).toBe(4);
    expect(result.forcedGcHeapStats?.[0].postForcedGcHeapUsed).toBe(50);
  });
});
