/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeRetryDelayMs } from './retry_delay';

describe('computeRetryDelayMs', () => {
  describe('fixed strategy', () => {
    it('returns 0 when delay is not configured', () => {
      expect(computeRetryDelayMs({}, 0)).toBe(0);
      expect(computeRetryDelayMs({ strategy: 'fixed' }, 0)).toBe(0);
      expect(computeRetryDelayMs({ strategy: 'fixed', delay: undefined }, 1)).toBe(0);
    });

    it('returns parsed delay in ms regardless of attempt', () => {
      expect(computeRetryDelayMs({ delay: '1s' }, 0)).toBe(1000);
      expect(computeRetryDelayMs({ delay: '1s' }, 1)).toBe(1000);
      expect(computeRetryDelayMs({ delay: '5s' }, 2)).toBe(5000);
      expect(computeRetryDelayMs({ delay: '100ms' }, 0)).toBe(100);
    });

    it('uses fixed strategy when strategy is explicit', () => {
      expect(computeRetryDelayMs({ delay: '1s', strategy: 'fixed', multiplier: 10 }, 2)).toBe(1000);
    });

    it('applies jitter when jitter is true (result in [0, delay])', () => {
      const results = new Set<number>();
      for (let i = 0; i < 50; i++) {
        const ms = computeRetryDelayMs({ delay: '1s', jitter: true }, 0);
        results.add(ms);
        expect(ms).toBeGreaterThanOrEqual(0);
        expect(ms).toBeLessThanOrEqual(1000);
      }
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('exponential strategy', () => {
    it('uses default initial delay 1s when delay not set', () => {
      expect(computeRetryDelayMs({ strategy: 'exponential' }, 0)).toBe(1000);
      expect(computeRetryDelayMs({ strategy: 'exponential' }, 1)).toBe(2000);
      expect(computeRetryDelayMs({ strategy: 'exponential' }, 2)).toBe(4000);
    });

    it('doubles delay each attempt with default multiplier 2', () => {
      expect(computeRetryDelayMs({ delay: '1s', strategy: 'exponential' }, 0)).toBe(1000);
      expect(computeRetryDelayMs({ delay: '1s', strategy: 'exponential' }, 1)).toBe(2000);
      expect(computeRetryDelayMs({ delay: '1s', strategy: 'exponential' }, 2)).toBe(4000);
      expect(computeRetryDelayMs({ delay: '1s', strategy: 'exponential' }, 3)).toBe(8000);
    });

    it('respects custom multiplier', () => {
      expect(computeRetryDelayMs({ delay: '1s', strategy: 'exponential', multiplier: 3 }, 0)).toBe(
        1000
      );
      expect(computeRetryDelayMs({ delay: '1s', strategy: 'exponential', multiplier: 3 }, 1)).toBe(
        3000
      );
      expect(computeRetryDelayMs({ delay: '1s', strategy: 'exponential', multiplier: 3 }, 2)).toBe(
        9000
      );
    });

    it('caps delay at max-delay when set', () => {
      expect(
        computeRetryDelayMs(
          {
            delay: '1s',
            strategy: 'exponential',
            'max-delay': '5s',
          },
          0
        )
      ).toBe(1000);
      expect(
        computeRetryDelayMs(
          {
            delay: '1s',
            strategy: 'exponential',
            'max-delay': '5s',
          },
          1
        )
      ).toBe(2000);
      expect(
        computeRetryDelayMs(
          {
            delay: '1s',
            strategy: 'exponential',
            'max-delay': '5s',
          },
          2
        )
      ).toBe(4000);
      expect(
        computeRetryDelayMs(
          {
            delay: '1s',
            strategy: 'exponential',
            'max-delay': '5s',
          },
          3
        )
      ).toBe(5000);
      expect(
        computeRetryDelayMs(
          {
            delay: '1s',
            strategy: 'exponential',
            'max-delay': '5s',
          },
          10
        )
      ).toBe(5000);
    });

    it('applies jitter when jitter is true (result in [0, capped delay])', () => {
      for (let i = 0; i < 30; i++) {
        const ms = computeRetryDelayMs(
          {
            delay: '1s',
            strategy: 'exponential',
            'max-delay': '5s',
            jitter: true,
          },
          2
        );
        expect(ms).toBeGreaterThanOrEqual(0);
        expect(ms).toBeLessThanOrEqual(4000);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Property-based tests (fast-check)
// ---------------------------------------------------------------------------

import { fc } from '@fast-check/jest';

describe('computeRetryDelayMs property-based tests', () => {
  const attemptArb = fc.integer({ min: 0, max: 20 });

  it('fixed strategy: result is always 0 when no delay configured', () => {
    fc.assert(
      fc.property(attemptArb, (attempt) => {
        expect(computeRetryDelayMs({}, attempt)).toBe(0);
        expect(computeRetryDelayMs({ strategy: 'fixed' }, attempt)).toBe(0);
      })
    );
  });

  it('fixed strategy: result equals parseDuration(delay) for any valid delay', () => {
    const delayArb = fc.integer({ min: 1, max: 9999 }).map((n) => `${n}ms`);
    fc.assert(
      fc.property(delayArb, attemptArb, (delay, attempt) => {
        const ms = computeRetryDelayMs({ strategy: 'fixed', delay }, attempt);
        // Fixed delay is independent of attempt
        expect(ms).toBe(computeRetryDelayMs({ strategy: 'fixed', delay }, 0));
        expect(ms).toBeGreaterThan(0);
      })
    );
  });

  it('exponential strategy: result is non-negative for any attempt', () => {
    fc.assert(
      fc.property(attemptArb, (attempt) => {
        const ms = computeRetryDelayMs({ delay: '1s', strategy: 'exponential' }, attempt);
        expect(ms).toBeGreaterThanOrEqual(0);
      })
    );
  });

  it('exponential strategy: result is always ≤ max-delay when max-delay is set', () => {
    fc.assert(
      fc.property(attemptArb, (attempt) => {
        const ms = computeRetryDelayMs(
          { delay: '1s', strategy: 'exponential', 'max-delay': '10s' },
          attempt
        );
        expect(ms).toBeLessThanOrEqual(10000);
      })
    );
  });

  it('jitter with fixed strategy: result is in [0, delay]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 5000 }).map((n) => `${n}ms`),
        attemptArb,
        (delay, attempt) => {
          const baseMs = computeRetryDelayMs({ strategy: 'fixed', delay }, attempt);
          const jitterMs = computeRetryDelayMs({ strategy: 'fixed', delay, jitter: true }, attempt);
          expect(jitterMs).toBeGreaterThanOrEqual(0);
          expect(jitterMs).toBeLessThanOrEqual(baseMs);
        }
      )
    );
  });
});
