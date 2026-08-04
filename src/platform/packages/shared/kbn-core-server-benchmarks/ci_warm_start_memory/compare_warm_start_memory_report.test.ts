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

const makeContext = ({
  enforcement = 'observe',
  naturalDelta = (pair: number) => (pair % 2 === 0 ? 0 : 60 * MIB),
  postForcedGcDelta = 10 * MIB,
}: {
  readonly enforcement?: 'observe' | 'fail';
  readonly naturalDelta?: (pair: number) => number;
  readonly postForcedGcDelta?: number;
} = {}): OnCompareContext => {
  const validPairs = Array.from({ length: 8 }, (_, pair) => {
    const baseline = makeStart({
      side: 'baseline',
      pair,
      tailHeapUsed: 800 * MIB,
      postForcedGcHeapUsed: 700 * MIB,
    });
    const target = makeStart({
      side: 'target',
      pair,
      tailHeapUsed: 800 * MIB + naturalDelta(pair),
      postForcedGcHeapUsed: 700 * MIB + postForcedGcDelta,
    });
    return { pair, baseline, target };
  });
  const config = {
    monitorInterval: 250,
    comparisonRun: {
      mode: 'randomized_paired',
      pairs: 8,
      maxAttempts: 12,
      enforcement,
    },
  } as OnCompareContext['left']['config'];

  return {
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
};

describe('post-forced-GC warm-start report', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses post-forced-GC heap for observation while retaining a higher blocking threshold', async () => {
    await compareWarmStartMemory(makeContext());

    const report = jest.mocked(writeWarmStartMemoryRegressionReport).mock.calls[0][0];
    expect(report.enforcement).toBe('observe');
    expect(report.outcome).toBe('regression');
    expect(report.protocol.observationThresholdBytes).toBe(5 * MIB);
    expect(report.protocol.blockingThresholdBytes).toBe(20 * MIB);
    expect(report.tailHeapUsed).toEqual(
      expect.objectContaining({
        meanBytes: 30 * MIB,
        wouldTrigger: false,
      })
    );
    expect(report.postForcedGcHeapUsed).toEqual(
      expect.objectContaining({
        meanBytes: 10 * MIB,
        sampleStandardDeviationBytes: 0,
        lowerConfidenceBoundBytes: 10 * MIB,
        wouldTrigger: true,
      })
    );
    expect(report.diagnostics.forcedGcDurationMs).toEqual(
      expect.objectContaining({
        pairs: expect.arrayContaining([
          expect.objectContaining({ baselineMs: 100, targetMs: 100, deltaMs: 0 }),
        ]),
        baselineMeanMs: 100,
        targetMeanMs: 100,
      })
    );
    expect(report.starts[0]).toEqual(
      expect.objectContaining({ forcedGcHeapStats: expect.any(Array) })
    );

    await expect(
      compareWarmStartMemory(makeContext({ enforcement: 'fail' }))
    ).resolves.toBeUndefined();
    await expect(
      compareWarmStartMemory(makeContext({ enforcement: 'fail', postForcedGcDelta: 30 * MIB }))
    ).rejects.toThrow('Warm-start memory regression detected');

    await compareWarmStartMemory(
      makeContext({
        naturalDelta: () => 10 * MIB,
        postForcedGcDelta: 3 * MIB,
      })
    );

    const diagnosticNaturalReport = jest.mocked(writeWarmStartMemoryRegressionReport).mock
      .calls[3][0];
    expect(diagnosticNaturalReport.outcome).toBe('observed');
    expect(diagnosticNaturalReport.tailHeapUsed).toEqual(
      expect.objectContaining({ wouldTrigger: true })
    );
    expect(diagnosticNaturalReport.postForcedGcHeapUsed).toEqual(
      expect.objectContaining({ wouldTrigger: false })
    );
  });
});
