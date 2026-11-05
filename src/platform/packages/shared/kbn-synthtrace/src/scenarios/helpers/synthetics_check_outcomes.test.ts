/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSeededRandom } from '@kbn/synthtrace-client';
import type { OutcomePattern } from './synthetics_check_outcomes';
import { getCheckDurationUs, getCheckOutcomes } from './synthetics_check_outcomes';

const outcomes = (pattern: OutcomePattern, count: number, seed = 'seed') =>
  getCheckOutcomes({ pattern, count, random: createSeededRandom(seed) });

describe('getCheckOutcomes', () => {
  it('returns no outcomes for no checks', () => {
    expect(outcomes({ type: 'healthy' }, 0)).toEqual([]);
    expect(outcomes({ type: 'flapping' }, 0)).toEqual([]);
  });

  it('healthy: every check is up', () => {
    expect(outcomes({ type: 'healthy' }, 3)).toEqual(['up', 'up', 'up']);
  });

  it('down: every check is down', () => {
    expect(outcomes({ type: 'down' }, 3)).toEqual(['down', 'down', 'down']);
  });

  describe('outage', () => {
    it('is up, then down for the last checks', () => {
      expect(outcomes({ type: 'outage', downChecks: 2 }, 5)).toEqual([
        'up',
        'up',
        'up',
        'down',
        'down',
      ]);
    });

    it('is all down when the outage covers every check, and all up when it is empty', () => {
      expect(outcomes({ type: 'outage', downChecks: 10 }, 3)).toEqual(['down', 'down', 'down']);
      expect(outcomes({ type: 'outage', downChecks: 0 }, 3)).toEqual(['up', 'up', 'up']);
      expect(outcomes({ type: 'outage', downChecks: -1 }, 3)).toEqual(['up', 'up', 'up']);
    });
  });

  describe('flapping', () => {
    it('is reproducible for the same seed and differs between seeds', () => {
      expect(outcomes({ type: 'flapping' }, 50, 'a')).toEqual(
        outcomes({ type: 'flapping' }, 50, 'a')
      );
      expect(outcomes({ type: 'flapping' }, 50, 'a')).not.toEqual(
        outcomes({ type: 'flapping' }, 50, 'b')
      );
    });

    it('returns the requested number of checks, both up and down', () => {
      const result = outcomes({ type: 'flapping' }, 50);

      expect(result).toHaveLength(50);
      expect(result).toContain('up');
      expect(result).toContain('down');
    });

    it('alternates on every check when the flip probability is 1', () => {
      const result = outcomes({ type: 'flapping', flipProbability: 1 }, 6);

      expect(result.slice(1).every((outcome, index) => outcome !== result[index])).toBe(true);
    });

    it('still changes state once when the random source never flips', () => {
      const neverFlips = () => 0.99;
      const result = getCheckOutcomes({
        pattern: { type: 'flapping' },
        count: 4,
        random: neverFlips,
      });

      expect(result).toEqual(['down', 'down', 'down', 'up']);
    });

    it('does not force a change for a single check', () => {
      expect(outcomes({ type: 'flapping' }, 1)).toHaveLength(1);
    });
  });
});

describe('getCheckDurationUs', () => {
  it('takes 100-500 ms for an up check', () => {
    const random = createSeededRandom('durations');

    for (let i = 0; i < 100; i++) {
      const duration = getCheckDurationUs('up', random);
      expect(duration).toBeGreaterThanOrEqual(100_000);
      expect(duration).toBeLessThan(500_000);
    }
  });

  it('takes 5-10 s for a down check', () => {
    const random = createSeededRandom('durations');

    for (let i = 0; i < 100; i++) {
      const duration = getCheckDurationUs('down', random);
      expect(duration).toBeGreaterThanOrEqual(5_000_000);
      expect(duration).toBeLessThan(10_000_000);
    }
  });

  it('is reproducible for the same seed', () => {
    expect(getCheckDurationUs('up', createSeededRandom('s'))).toBe(
      getCheckDurationUs('up', createSeededRandom('s'))
    );
  });
});
