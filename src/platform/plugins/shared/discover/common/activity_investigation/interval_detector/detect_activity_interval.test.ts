/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import seedrandom from 'seedrandom';
import { calibrateIntervalScores, getCalibrationBlocks } from './calibration';
import {
  ACTIVITY_INTERVAL_DETECTOR_CONFIG,
  detectActivityInterval,
} from './detect_activity_interval';
import { getInternalIntervalCandidates } from './internal_reference';
import { createIntervalScorer } from './interval_score';

const day = (bucketCount: number, offset: number): number[] =>
  Array.from({ length: bucketCount }, (_, bucket) => 100 + ((bucket * 7 + offset * 3) % 11));

const references = (bucketCount: number): number[][] =>
  Array.from({ length: 6 }, (_, index) => day(bucketCount, index + 1));

const withRise = (bucketCount: number, start: number, end: number): number[] =>
  day(bucketCount, 0).map((count, bucket) => (bucket >= start && bucket < end ? count * 2 : count));

const referenceOf = (bucketCount: number, start: number) => {
  const counts = day(bucketCount, 0).map((count, bucket) => (bucket === start ? count * 3 : count));

  return getInternalIntervalCandidates(counts, ACTIVITY_INTERVAL_DETECTOR_CONFIG).candidates.find(
    (candidate) => candidate.start === start && candidate.end === start + 1
  )?.reference;
};

describe('interval detector (B)', () => {
  describe('internal reference', () => {
    it('keeps the validated window on 48 buckets', () => {
      expect(referenceOf(48, 20)).toEqual({ start: 6, end: 19 });
    });

    it('keeps the same share of the view on other grids', () => {
      expect(referenceOf(60, 30)).toEqual({ start: 12, end: 29 });
    });

    it('does not propose intervals without enough preceding buckets', () => {
      expect(referenceOf(48, 3)).toBeUndefined();
    });
  });

  describe('calibration', () => {
    it('uses six aligned blocks whose sizes differ by at most one bucket', () => {
      expect(getCalibrationBlocks(48, 6)).toEqual([0, 8, 16, 24, 32, 40, 48]);
      expect(getCalibrationBlocks(50, 6)).toEqual([0, 8, 16, 25, 33, 41, 50]);
      expect(getCalibrationBlocks(47, 6)).toEqual([0, 7, 15, 23, 31, 39, 47]);
    });

    it('is unassessable when no replicate has a usual level on both sides', () => {
      const zeros = Array.from({ length: 6 }, () => new Array<number>(48).fill(0));

      expect(
        calibrateIntervalScores({
          references: zeros,
          random: seedrandom('calibration'),
          replicates: 999,
          profileReferences: 3,
          blocks: 6,
        })
      ).toEqual({ status: 'unassessable', reason: 'no-calibratable-intervals', failedReplicate: 1 });
    });

    it('rejects invalid random draws', () => {
      expect(() =>
        calibrateIntervalScores({
          references: references(48),
          random: () => 1,
          replicates: 1,
          profileReferences: 3,
          blocks: 6,
        })
      ).toThrow('Invalid random draw');
    });
  });

  describe('interval score', () => {
    it('scores zero when the view matches the references', () => {
      const flat = new Array<number>(48).fill(100);
      const scorer = createIntervalScorer(flat, [flat, flat, flat]);

      expect(scorer(10, 20)?.score).toBe(0);
    });

    it('has no usual level where the references are empty inside the interval', () => {
      const empty = new Array<number>(48).fill(100).map((count, bucket) => (bucket < 10 ? 0 : count));
      const scorer = createIntervalScorer(empty, [empty, empty, empty]);

      expect(scorer(0, 10)).toBeNull();
    });
  });

  describe('detection', () => {
    it.each([
      [48, 30, 36],
      [60, 36, 44],
      [47, 30, 36],
      [56, 30, 38],
    ])('admits a doubled interval on %i buckets', (bucketCount, start, end) => {
      const result = detectActivityInterval({
        current: withRise(bucketCount, start, end),
        references: references(bucketCount),
        random: seedrandom('detection'),
      });

      expect(result).toMatchObject({ status: 'admitted', interval: { start, end }, p: 0.001 });
    });

    it('does not ask when the rise is the usual one at those hours', () => {
      const bump = (offset: number): number[] =>
        day(48, offset).map((count, bucket) => (bucket >= 30 && bucket < 36 ? count + 40 : count));
      const usual = Array.from({ length: 6 }, (_, index) => bump(index + 1));

      const result = detectActivityInterval({
        current: bump(0),
        references: usual,
        random: seedrandom('usual'),
      });

      expect(result.status).toBe('none');
      expect(result.status === 'none' && result.p).toBeGreaterThan(0.5);
      expect(
        detectActivityInterval({
          current: bump(0),
          references: usual,
          random: seedrandom('usual'),
          earlyStop: true,
        })
      ).toMatchObject({ status: 'none', p: null, stoppedAfterReplicates: 50 });
    });

    it('does not calibrate without internal candidates when stopping early', () => {
      expect(
        detectActivityInterval({
          current: day(48, 2),
          references: references(48),
          random: () => {
            throw new Error('No calibration expected');
          },
          earlyStop: true,
        })
      ).toMatchObject({ status: 'none', p: null });
    });

    it('keeps the unassessable status when stopping early with an empty history', () => {
      const empty = Array.from({ length: 6 }, () => new Array<number>(48).fill(0));
      const full = detectActivityInterval({
        current: day(48, 2),
        references: empty,
        random: seedrandom('empty'),
      });

      expect(
        detectActivityInterval({
          current: day(48, 2),
          references: empty,
          random: seedrandom('empty'),
          earlyStop: true,
        })
      ).toEqual(full);
      expect(full).toMatchObject({ status: 'unassessable', reason: 'no-calibratable-intervals' });
    });

    it('rejects an invalid alpha', () => {
      expect(() =>
        detectActivityInterval({
          current: day(48, 0),
          references: references(48),
          random: seedrandom('alpha'),
          alpha: Number.NaN,
        })
      ).toThrow('Expected alpha strictly between 0 and 1');
    });

    it('is unassessable with empty history', () => {
      expect(
        detectActivityInterval({
          current: day(48, 0),
          references: Array.from({ length: 6 }, () => new Array<number>(48).fill(0)),
          random: seedrandom('empty'),
        })
      ).toMatchObject({ status: 'unassessable', reason: 'no-calibratable-intervals' });
    });

    it('gives the same answer for the same seed', () => {
      const run = () =>
        detectActivityInterval({
          current: withRise(48, 30, 36),
          references: references(48),
          random: seedrandom('same'),
        });

      expect(run()).toEqual(run());
    });

    describe('sums of a numeric field (extension)', () => {
      const scaled = (counts: readonly number[]): number[] => counts.map((count) => count * 1.37);

      it('admits a doubled interval on decimal sums', () => {
        expect(
          detectActivityInterval({
            current: scaled(withRise(48, 30, 36)),
            references: references(48).map(scaled),
            random: seedrandom('sums'),
            kind: 'sums',
          })
        ).toMatchObject({ status: 'admitted', interval: { start: 30, end: 36 } });
      });

      it('rejects negative sums', () => {
        const negative = scaled(day(48, 0)).map((value, bucket) => (bucket === 5 ? -1 : value));

        expect(() =>
          detectActivityInterval({
            current: negative,
            references: references(48).map(scaled),
            random: seedrandom('negative'),
            kind: 'sums',
          })
        ).toThrow('Expected complete nonnegative counts for the view and six references');
      });

      it('keeps counts integer', () => {
        expect(() =>
          detectActivityInterval({
            current: scaled(day(48, 0)),
            references: references(48),
            random: seedrandom('counts'),
          })
        ).toThrow('Expected complete nonnegative counts for the view and six references');
      });
    });

    it('rejects an incomplete history', () => {
      expect(() =>
        detectActivityInterval({
          current: day(48, 0),
          references: references(48).slice(0, 5),
          random: seedrandom('incomplete'),
        })
      ).toThrow('Expected complete nonnegative counts for the view and six references');
    });
  });
});
