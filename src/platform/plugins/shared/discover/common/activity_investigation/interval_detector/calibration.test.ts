/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  calibrateIntervalScores,
  getCalibrationBlocks,
  type IntervalCalibration,
  type IntervalCalibrationOptions,
} from './calibration';
import { getMaximumIntervalScore } from './interval_score';
import { createSeededRandom } from './seeded_random';

// Keep the allocating implementation as a reference for draw order and buffer reuse.
const calibrateWithFreshArrays = ({
  references,
  random,
  replicates,
  profileReferences,
  blocks,
  kind,
  stopAbove,
}: IntervalCalibrationOptions): IntervalCalibration => {
  const boundaries = getCalibrationBlocks(references[0].length, blocks);
  const maxima: number[] = [];
  let exceeding = 0;
  for (let replicate = 0; replicate < replicates; replicate++) {
    const days = Array.from({ length: profileReferences + 1 }, () => {
      const counts: number[] = [];
      for (let block = 0; block < blocks; block++) {
        const donor = references[Math.floor(random() * references.length)];
        for (let bucket = boundaries[block]; bucket < boundaries[block + 1]; bucket++) {
          counts.push(donor[bucket]);
        }
      }
      return counts;
    });
    const maximum = getMaximumIntervalScore(
      days[profileReferences],
      days.slice(0, profileReferences),
      kind
    );
    if (maximum === null) {
      return {
        status: 'unassessable',
        reason: 'no-calibratable-intervals',
        failedReplicate: replicate + 1,
      };
    }
    maxima.push(maximum);
    if (stopAbove && maximum >= stopAbove.score) {
      exceeding++;
      if ((1 + exceeding) / (replicates + 1) > stopAbove.alpha) {
        return { status: 'stopped', replicates: replicate + 1, exceeding };
      }
    }
  }
  return { status: 'ready', maxima };
};

describe('calibration buffer reuse', () => {
  it.each([24, 47, 48, 60])('preserves every maximum and random draw on %i buckets', (buckets) => {
    const references = Array.from({ length: 6 }, (_, day) =>
      Array.from({ length: buckets }, (_, bucket) => 10 + ((day * 11 + bucket * 7) % 19))
    );
    for (const kind of ['counts', 'sums'] as const) {
      const currentRandom = createSeededRandom('buffer-parity');
      const referenceRandom = createSeededRandom('buffer-parity');
      const options = {
        references: references.map((values) =>
          values.map((value) => (kind === 'sums' ? value * 1.37 : value))
        ),
        replicates: 31,
        profileReferences: 3,
        blocks: 6,
        kind,
      };
      const original = options.references.map((values) => [...values]);
      expect(calibrateIntervalScores({ ...options, random: currentRandom })).toEqual(
        calibrateWithFreshArrays({ ...options, random: referenceRandom })
      );
      expect(currentRandom()).toBe(referenceRandom());
      expect(options.references).toEqual(original);
    }
  });

  it.each([0, 10])('preserves undefined maxima and early stopping with bucket value %i', (value) => {
    const options = {
      references: Array.from({ length: 6 }, () => new Array<number>(48).fill(value)),
      replicates: 31,
      profileReferences: 3,
      blocks: 6,
      stopAbove: { score: 0, alpha: 0.05 },
    };
    expect(calibrateIntervalScores({ ...options, random: createSeededRandom('stop') })).toEqual(
      calibrateWithFreshArrays({ ...options, random: createSeededRandom('stop') })
    );
  });
});
