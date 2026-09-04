/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('#pipeline-utils', () => ({
  upsertComment: jest.fn(),
  BuildkiteClient: jest.fn(),
}));

import {
  buildCiStatsMetrics,
  buildCommentBody,
  type WarmStartMemoryReport,
} from './notify_warm_start_memory';

const MIB = 1024 * 1024;

const report = (overrides: Partial<WarmStartMemoryReport> = {}): WarmStartMemoryReport => ({
  version: 2,
  outcome: 'regression',
  context: {
    baselineCommit: 'c068037b308eaa40c835e1016392587e2680e914',
    targetCommit: 'f34aaebb053fee8e04cbb673551356e532819b8f',
  },
  protocol: { thresholdBytes: 5 * MIB },
  comparison: { requestedPairs: 4, attemptedPairs: 4, validPairs: 4 },
  tailHeapUsed: { meanBytes: 12 * MIB },
  postForcedGcHeapUsed: {
    pairCount: 4,
    meanBytes: 11 * MIB,
    sampleStandardDeviationBytes: 1.2 * MIB,
    baselineMeanBytes: 300 * MIB,
    targetMeanBytes: 311 * MIB,
  },
  ...overrides,
});

describe('buildCommentBody', () => {
  it('returns null when no regression was detected', () => {
    expect(buildCommentBody(report({ outcome: 'observed' }))).toBeNull();
  });

  it('returns null when the comparison was inconclusive', () => {
    expect(buildCommentBody(report({ outcome: 'inconclusive' }))).toBeNull();
  });

  it('reports the signed delta, threshold and both commits on a regression', () => {
    const body = buildCommentBody(report());

    expect(body).toContain('Warm-start memory regression detected');
    expect(body).toContain('+11.00 MiB');
    expect(body).toContain('5.00 MiB');
    expect(body).toContain('c068037b308e');
    expect(body).toContain('f34aaebb053f');
    expect(body).toContain('4 of 4 attempted');
  });

  it('marks the check as non-blocking', () => {
    expect(buildCommentBody(report())).toContain('non-blocking');
  });

  it('renders missing metrics as n/a rather than NaN', () => {
    const body = buildCommentBody(report({ postForcedGcHeapUsed: { meanBytes: 11 * MIB } }));

    expect(body).toContain('n/a');
    expect(body).not.toContain('NaN');
  });
});

describe('buildCiStatsMetrics', () => {
  it('returns null when the comparison was inconclusive', () => {
    expect(buildCiStatsMetrics(report({ outcome: 'inconclusive' }))).toBeNull();
  });

  it('reports metrics for a clean run so the historical series stays continuous', () => {
    const metrics = buildCiStatsMetrics(report({ outcome: 'observed' }));

    expect(metrics).not.toBeNull();
    expect(metrics!.length).toBeGreaterThan(0);
    expect(metrics!.every((metric) => metric.group === 'warm start memory')).toBe(true);
  });

  it('records the paired delta as an integer number of bytes', () => {
    const delta = buildCiStatsMetrics(report())!.find(
      (metric) => metric.id === 'post forced gc heap delta'
    );

    expect(delta).toEqual(expect.objectContaining({ value: 11 * MIB, group: 'warm start memory' }));
  });

  it('never sets a limit, which would make the check blocking', () => {
    expect(buildCiStatsMetrics(report())!.every((metric) => metric.limit === undefined)).toBe(true);
  });

  it('drops metrics that are missing from the report', () => {
    const metrics = buildCiStatsMetrics(
      report({ postForcedGcHeapUsed: { meanBytes: 11 * MIB }, tailHeapUsed: {} })
    );

    expect(metrics!.map((metric) => metric.id)).toEqual(['post forced gc heap delta']);
  });

  it('carries both commits and the outcome as metadata', () => {
    const [metric] = buildCiStatsMetrics(report())!;

    expect(metric.meta).toEqual(
      expect.objectContaining({
        outcome: 'regression',
        validPairs: 4,
        baselineCommit: 'c068037b308eaa40c835e1016392587e2680e914',
      })
    );
  });
});
