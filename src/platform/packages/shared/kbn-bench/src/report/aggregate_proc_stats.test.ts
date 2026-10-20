/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  aggregateForcedGcHeapStats,
  aggregateProcStats,
  aggregateProcStatSamples,
} from './aggregate_proc_stats';
import type { ForcedGcHeapStats, ProcStatSample } from '../runner/monitor/types';

const makeSample = ({
  pid,
  time,
  rss,
}: {
  pid: number;
  time: number;
  rss: number;
}): ProcStatSample => {
  return {
    pid,
    argv: ['node', 'benchmark.js'],
    time,
    cpuUsage: time,
    rss,
    rssMax: rss + 100,
    tailRss: 0,
    heapUsed: rss + 200,
    heapTotal: rss + 300,
    external: rss + 400,
    arrayBuffers: rss + 500,
    tailHeapUsed: 0,
    tailHeapTotal: 0,
    tailExternal: 0,
    tailArrayBuffers: 0,
    heapUsage: 0.5,
    gcTotal: 0,
    gcMajor: 0,
    gcMinor: 0,
    gcIncremental: 0,
    gcWeakCb: 0,
  };
};

describe('aggregateProcStatSamples', () => {
  it('uses the median of the last 8 current RSS samples as tail RSS', () => {
    const samples = Array.from({ length: 10 }, (_, index) =>
      makeSample({
        pid: 100,
        time: index + 1,
        rss: (index + 1) * 100,
      })
    );

    expect(aggregateProcStatSamples(samples).tailRss).toBe(650);
  });

  it('uses the median of the last 8 heap and external samples as tail context', () => {
    const samples = Array.from({ length: 10 }, (_, index) =>
      makeSample({
        pid: 100,
        time: index + 1,
        rss: (index + 1) * 100,
      })
    );

    expect(aggregateProcStatSamples(samples)).toEqual(
      expect.objectContaining({
        tailHeapUsed: 850,
        tailHeapTotal: 950,
        tailExternal: 1050,
        tailArrayBuffers: 1150,
      })
    );
  });
});

describe('aggregateForcedGcHeapStats', () => {
  const makeForcedGcStats = (pid: number, postForcedGcHeapUsed: number): ForcedGcHeapStats => ({
    requestId: 'request',
    pid,
    argv: ['node'],
    requestedAt: '2026-01-01T00:00:00.000Z',
    startedAt: '2026-01-01T00:00:01.000Z',
    completedAt: '2026-01-01T00:00:02.000Z',
    nodeVersion: '24.18.0',
    v8Version: '13.6',
    preForcedGcHeapUsed: postForcedGcHeapUsed + 100,
    postForcedGcHeapUsed,
    forcedGcHeapReduction: 100,
    forcedGcDurationMs: 10,
  });

  it('sums the separate forced-GC signal across monitored processes', () => {
    expect(
      aggregateForcedGcHeapStats([makeForcedGcStats(100, 200), makeForcedGcStats(200, 300)])
    ).toEqual({
      preForcedGcHeapUsed: 700,
      postForcedGcHeapUsed: 500,
      forcedGcHeapReduction: 200,
      forcedGcDurationMs: 20,
    });
  });

  it('does not substitute a partial or failed forced-GC result', () => {
    expect(
      aggregateForcedGcHeapStats([
        makeForcedGcStats(100, 200),
        { ...makeForcedGcStats(200, 300), error: { name: 'Error', message: 'probe failed' } },
      ])
    ).toBeUndefined();
  });
});

describe('aggregateProcStats', () => {
  it('sums tail memory metrics across monitored processes', () => {
    const firstProcess = aggregateProcStatSamples([
      makeSample({ pid: 100, time: 1, rss: 100 }),
      makeSample({ pid: 100, time: 2, rss: 200 }),
    ]);
    const secondProcess = aggregateProcStatSamples([
      makeSample({ pid: 200, time: 1, rss: 300 }),
      makeSample({ pid: 200, time: 2, rss: 400 }),
    ]);

    expect(aggregateProcStats([firstProcess, secondProcess])).toEqual(
      expect.objectContaining({
        tailRss: 500,
        tailHeapUsed: 900,
        tailHeapTotal: 1100,
        tailExternal: 1300,
        tailArrayBuffers: 1500,
      })
    );
  });
});
