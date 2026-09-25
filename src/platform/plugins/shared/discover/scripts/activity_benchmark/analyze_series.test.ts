/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  describeActivityChangePoints as describeChangePointCandidates,
  getStrongestChangePointIncrease,
} from '../../common/activity_investigation/describe_activity_change_points';

const HOUR_MS = 60 * 60 * 1000;
const point = (index: number, type = 'step_change') => ({ index, type, pvalue: 0.001 });
const counts = (value: (bucket: number) => number) => Array.from({ length: 48 }, (_, i) => value(i));

describe('change point interpretation', () => {
  it.each([
    [3, 'spike'],
    [6, 'trend_change'],
  ])('ends a %i-bucket %s without a second change point', (duration, type) => {
    const result = describeChangePointCandidates(
      counts((bucket) => (bucket >= 24 && bucket < 24 + duration ? 150 : 100)),
      [point(24, type)],
      HOUR_MS,
      0
    );

    expect(result.candidates).toEqual([
      expect.objectContaining({
        status: 'detected',
        startBucket: 24,
        endBucket: 24 + duration,
        endTimeMs: (24 + duration) * HOUR_MS,
        baseline: 100,
        observedMean: 150,
        percentageChange: 50,
      }),
    ]);
    expect(getStrongestChangePointIncrease(result)).toMatchObject({
      kind: type,
      pvalue: 0.001,
      bucketCount: duration,
    });
  });

  it('keeps a persistent 100 → 130 step at +30%', () => {
    const result = describeChangePointCandidates(
      counts((bucket) => (bucket < 24 ? 100 : 130)),
      [point(24)],
      HOUR_MS,
      0
    );

    expect(result.candidates[0]).toMatchObject({
      status: 'detected',
      endBucket: 48,
      baseline: 100,
      percentageChange: 30,
    });
  });

  it('keeps an isolated spike to one bucket', () => {
    const result = describeChangePointCandidates(
      counts((bucket) => (bucket === 24 ? 250 : 100)),
      [point(24, 'spike')],
      HOUR_MS,
      0
    );

    expect(result.candidates[0]).toMatchObject({ endBucket: 25, percentageChange: 150 });
  });

  it('returns the measured AIOps reference with the selected increase', () => {
    const result = describeChangePointCandidates(
      counts((bucket) => (bucket < 24 ? 100 : 130)),
      [point(24)],
      HOUR_MS,
      0
    );

    expect(getStrongestChangePointIncrease(result)).toMatchObject({
      kind: 'step_change',
      pvalue: 0.001,
      baseline: 100,
      percentageChange: 30,
      referenceTimeRange: { startTimeMs: 10 * HOUR_MS, endTimeMs: 23 * HOUR_MS },
    });
  });

  it('does not round the reference rate before applying the percentage floor', () => {
    const result = describeChangePointCandidates(
      counts((bucket) => (bucket >= 24 ? 120 : bucket === 10 ? 101 : 100)),
      [point(24)],
      HOUR_MS,
      0
    );

    expect(result.candidates[0].baseline).toBeCloseTo(1301 / 13);
    expect(result.candidates[0].percentageChange).toBeCloseTo(
      ((120 - 1301 / 13) / (1301 / 13)) * 100
    );
    expect(result.status).toBe('detected');
    expect(getStrongestChangePointIncrease(result)).toBeUndefined();
  });

  it.each([19, 20, 21])(
    'keeps a +%i%% candidate and applies the display floor only on selection',
    (percentage) => {
      const result = describeChangePointCandidates(
        counts((bucket) => (bucket < 24 ? 100 : 100 + percentage)),
        [point(24)],
        HOUR_MS,
        0
      );

      expect(result.status).toBe('detected');
      expect(result.candidates[0].increase?.percentageChange).toBe(percentage);
      if (percentage > 20) {
        expect(getStrongestChangePointIncrease(result)).toMatchObject({
          percentageChange: percentage,
        });
      } else {
        expect(getStrongestChangePointIncrease(result)).toBeUndefined();
      }
    }
  );

  it('filters before selecting the highest-excess candidate in a series', () => {
    const result = describeChangePointCandidates(
      counts((bucket) => (bucket >= 14 && bucket < 28 ? 110 : bucket === 40 ? 140 : 100)),
      [point(14), point(28), point(40, 'spike')],
      HOUR_MS,
      0
    );

    expect(getStrongestChangePointIncrease(result, 0)).toMatchObject({
      startTimeMs: 14 * HOUR_MS,
      percentageChange: 10,
      excess: 140,
    });
    expect(getStrongestChangePointIncrease(result)).toMatchObject({
      startTimeMs: 40 * HOUR_MS,
      percentageChange: 40,
      excess: 40,
    });
  });

  it('abstains when the selected period cannot supply six reference buckets', () => {
    const result = describeChangePointCandidates(
      counts((bucket) => (bucket < 5 ? 100 : 150)),
      [point(5)],
      HOUR_MS,
      0
    );

    expect(result.candidates[0]).toMatchObject({
      status: 'unassessable',
      reason: 'fewer-than-six-reference-buckets',
      referenceStartBucket: 0,
      referenceEndBucket: 4,
      increase: null,
    });
  });

  it.each([
    [24, 1],
    [24, 3],
    [168, 1],
  ])('abstains for a %i-hour cycle with %i-hour buckets', (cycleHours, bucketHours) => {
    const period = cycleHours / bucketHours;
    const result = describeChangePointCandidates(
      Array.from({ length: Math.max(48, 2 * period) }, (_, bucket) =>
        Math.round(100 + 40 * Math.sin((2 * Math.PI * bucket) / period))
      ),
      [point(period + period / 4, 'spike')],
      bucketHours * HOUR_MS,
      0
    );

    expect(result).toMatchObject({ status: 'unassessable', periodBuckets: period });
    expect(result.candidates[0]).toMatchObject({
      reason: 'repeating-cycle-needs-seasonal-reference',
      baseline: null,
      percentageChange: null,
      increase: null,
    });
    expect(getStrongestChangePointIncrease(result)).toBeUndefined();
  });

  it('keeps daily repetition unassessable even when ES returns no point', () => {
    const result = describeChangePointCandidates(
      counts((bucket) => Math.round(100 + 40 * Math.sin((2 * Math.PI * bucket) / 24))),
      [],
      HOUR_MS,
      0
    );

    expect(result).toEqual({ status: 'unassessable', periodBuckets: 24, candidates: [] });
  });

  it('also abstains on a real increase inside a recognized daily cycle', () => {
    const result = describeChangePointCandidates(
      counts(
        (bucket) =>
          Math.round(100 + 40 * Math.sin((2 * Math.PI * bucket) / 24)) + (bucket >= 24 ? 30 : 0)
      ),
      [point(24)],
      HOUR_MS,
      0
    );

    expect(result).toMatchObject({ status: 'unassessable', periodBuckets: 24 });
    expect(result.candidates[0]).toMatchObject({
      reason: 'repeating-cycle-needs-seasonal-reference',
      increase: null,
    });
    expect(getStrongestChangePointIncrease(result)).toBeUndefined();
  });

  it('keeps a steadily growing trend', () => {
    const result = describeChangePointCandidates(
      counts((bucket) => (bucket < 24 ? 100 : 100 + 5 * (bucket - 23))),
      [point(24, 'trend_change')],
      HOUR_MS,
      0
    );

    expect(result.status).toBe('detected');
    expect(getStrongestChangePointIncrease(result)).toMatchObject({
      kind: 'trend_change',
      pvalue: 0.001,
    });
  });

  it('does not end a sustained increase at one noisy bucket', () => {
    const result = describeChangePointCandidates(
      counts((bucket) => (bucket >= 24 && bucket < 36 && bucket !== 27 ? 150 : 100)),
      [point(24, 'trend_change')],
      HOUR_MS,
      0
    );

    expect(result.candidates[0]).toMatchObject({ status: 'detected', endBucket: 36 });
  });
});
