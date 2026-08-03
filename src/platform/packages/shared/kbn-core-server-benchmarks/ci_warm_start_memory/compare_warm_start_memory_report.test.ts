/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnCompareContext, PairedComparisonStart } from '@kbn/bench';
import type { ToolingLog } from '@kbn/tooling-log';
import { compareWarmStartMemory } from './compare_warm_start_memory';
import { writeWarmStartMemoryRegressionReport } from './memory_regression_report';

jest.mock('./memory_regression_report', () => ({
  ...jest.requireActual('./memory_regression_report'),
  writeWarmStartMemoryRegressionReport: jest.fn().mockResolvedValue('report.json'),
}));

const MIB = 1024 * 1024;

const makeStart = ({
  side,
  pair,
  tailHeapUsed,
  postForcedGcHeapUsed,
}: {
  side: 'baseline' | 'target';
  pair: number;
  tailHeapUsed: number;
  postForcedGcHeapUsed: number;
}): PairedComparisonStart => ({
  attempt: pair,
  pair,
  side,
  orderPosition: side === 'baseline' ? 0 : 1,
  result: {
    status: 'completed',
    time: 30_000,
    metrics: {},
    stats: [
      {
        pid: 100 + pair,
        argv: ['node'],
        cpuUsage: 1,
        rss: 1,
        rssMax: 1,
        tailRss: 1,
        heapUsed: tailHeapUsed,
        heapTotal: tailHeapUsed,
        external: 1,
        arrayBuffers: 1,
        heapUsage: 1,
        tailHeapUsed,
        tailHeapTotal: tailHeapUsed,
        tailExternal: 1,
        tailArrayBuffers: 1,
        gcTotal: 1,
        gcMajor: 1,
        gcMinor: 0,
        gcIncremental: 0,
        gcWeakCb: 0,
      },
    ],
    forcedGcHeapStats: [
      {
        requestId: `request-${side}-${pair}`,
        pid: 100 + pair,
        argv: ['node'],
        requestedAt: '2026-01-01T00:00:00.000Z',
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:00:01.000Z',
        nodeVersion: '24.18.0',
        v8Version: '13.6',
        preForcedGcHeapUsed: postForcedGcHeapUsed + 10 * MIB,
        postForcedGcHeapUsed,
        forcedGcHeapReduction: 10 * MIB,
        forcedGcDurationMs: 100,
      },
    ],
  },
});

describe('post-forced-GC warm-start report', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reports natural and post-forced-GC paired statistics independently', async () => {
    const validPairs = Array.from({ length: 8 }, (_, pair) => {
      const naturalDelta = pair % 2 === 0 ? 0 : 60 * MIB;
      const baseline = makeStart({
        side: 'baseline',
        pair,
        tailHeapUsed: 800 * MIB,
        postForcedGcHeapUsed: 700 * MIB,
      });
      const target = makeStart({
        side: 'target',
        pair,
        tailHeapUsed: 800 * MIB + naturalDelta,
        postForcedGcHeapUsed: 730 * MIB,
      });
      return { pair, baseline, target };
    });
    const config = {
      monitorInterval: 250,
      comparisonRun: {
        mode: 'randomized_paired',
        pairs: 8,
        maxAttempts: 12,
        enforcement: 'observe',
      },
    } as OnCompareContext['left']['config'];
    const context: OnCompareContext = {
      log: {
        info: jest.fn(),
        warning: jest.fn(),
      } as unknown as ToolingLog,
      left: { config, benchmarks: [] },
      right: { config, benchmarks: [] },
      leftSummary: { name: 'left', benchmarks: [] },
      rightSummary: { name: 'right', benchmarks: [] },
      comparison: { benchmarks: [] },
      pairedComparison: {
        mode: 'randomized_paired',
        seed: 'darwin-ab',
        baselineIdentity: 'A',
        targetIdentity: 'B',
        benchmarks: [
          {
            benchmarkName: 'warm_start',
            requestedPairs: 8,
            attemptedPairs: 8,
            validPairs,
            starts: validPairs.flatMap(({ baseline, target }) => [baseline, target]),
            order: Array.from({ length: 8 }, () => 'baseline-target' as const),
          },
        ],
      },
    };

    await compareWarmStartMemory(context);

    const report = jest.mocked(writeWarmStartMemoryRegressionReport).mock.calls[0][0];
    expect(report.enforcement).toBe('observe');
    expect(report.tailHeapUsed).toEqual(
      expect.objectContaining({
        meanBytes: 30 * MIB,
        wouldTrigger: false,
      })
    );
    expect(report.postForcedGcHeapUsed).toEqual(
      expect.objectContaining({
        meanBytes: 30 * MIB,
        sampleStandardDeviationBytes: 0,
        lowerConfidenceBoundBytes: 30 * MIB,
        wouldTrigger: true,
      })
    );
    expect(report.starts[0]).toEqual(
      expect.objectContaining({
        forcedGcHeapStats: validPairs[0].baseline.result.forcedGcHeapStats,
      })
    );
  });
});
