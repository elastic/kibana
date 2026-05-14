/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  applyJitter,
  computeNextDelayMs,
  computeNextPollAt,
  enforceCeilings,
  type PollBookkeeping,
} from './poll_scheduler';

const baseBookkeeping = (overrides: Partial<PollBookkeeping> = {}): PollBookkeeping => ({
  attempt: 0,
  startedAt: 1_000,
  lastInvocationAt: 1_000,
  ...overrides,
});

describe('poll_scheduler', () => {
  describe('computeNextDelayMs', () => {
    it('returns the constant interval for fixed strategy', () => {
      const delay = computeNextDelayMs(
        { strategy: 'fixed', intervalMs: 5_000 },
        baseBookkeeping({ attempt: 7 }),
        undefined
      );
      expect(delay).toBe(5_000);
    });

    it('returns initialMs on the first poll for exponential strategy', () => {
      const delay = computeNextDelayMs(
        { strategy: 'exponential', initialMs: 1_000, maxMs: 60_000 },
        baseBookkeeping({ attempt: 0 }),
        undefined
      );
      expect(delay).toBe(1_000);
    });

    it('doubles by default factor each attempt for exponential strategy', () => {
      const policy = { strategy: 'exponential' as const, initialMs: 1_000, maxMs: 60_000 };
      expect(computeNextDelayMs(policy, baseBookkeeping({ attempt: 1 }), undefined)).toBe(2_000);
      expect(computeNextDelayMs(policy, baseBookkeeping({ attempt: 2 }), undefined)).toBe(4_000);
      expect(computeNextDelayMs(policy, baseBookkeeping({ attempt: 3 }), undefined)).toBe(8_000);
    });

    it('honors a custom factor for exponential strategy', () => {
      const policy = {
        strategy: 'exponential' as const,
        initialMs: 1_000,
        maxMs: 60_000,
        factor: 3,
      };
      expect(computeNextDelayMs(policy, baseBookkeeping({ attempt: 1 }), undefined)).toBe(3_000);
      expect(computeNextDelayMs(policy, baseBookkeeping({ attempt: 2 }), undefined)).toBe(9_000);
    });

    it('caps exponential delay at maxMs', () => {
      const policy = { strategy: 'exponential' as const, initialMs: 1_000, maxMs: 5_000 };
      expect(computeNextDelayMs(policy, baseBookkeeping({ attempt: 10 }), undefined)).toBe(5_000);
    });

    it('applies jitter in [0.5x, 1.5x] when enabled (low end)', () => {
      const policy = {
        strategy: 'exponential' as const,
        initialMs: 1_000,
        maxMs: 60_000,
        jitter: true,
      };
      const random = () => 0; // factor = 0.5
      expect(computeNextDelayMs(policy, baseBookkeeping({ attempt: 0 }), undefined, random)).toBe(
        500
      );
    });

    it('applies jitter in [0.5x, 1.5x] when enabled (high end)', () => {
      const policy = {
        strategy: 'exponential' as const,
        initialMs: 1_000,
        maxMs: 60_000,
        jitter: true,
      };
      const random = () => 0.999_999; // factor ≈ 1.5
      const delay = computeNextDelayMs(policy, baseBookkeeping({ attempt: 0 }), undefined, random);
      expect(delay).toBeGreaterThanOrEqual(1_499);
      expect(delay).toBeLessThanOrEqual(1_500);
    });

    it('invokes dynamic.next with the engine bookkeeping and author state', () => {
      const next = jest.fn().mockReturnValue(7_500);
      const delay = computeNextDelayMs(
        { strategy: 'dynamic', next },
        baseBookkeeping({ attempt: 3, startedAt: 1_000, lastInvocationAt: 8_000 }),
        { hint: 'retry-after' }
      );
      expect(delay).toBe(7_500);
      expect(next).toHaveBeenCalledWith({
        attempt: 3,
        startedAt: 1_000,
        lastInvocationAt: 8_000,
        state: { hint: 'retry-after' },
      });
    });
  });

  describe('computeNextPollAt', () => {
    it('returns an absolute Date at now + delay', () => {
      const { nextPollAt, delayMs } = computeNextPollAt(
        { strategy: 'fixed', intervalMs: 30_000 },
        baseBookkeeping(),
        undefined,
        1_700_000_000_000
      );
      expect(delayMs).toBe(30_000);
      expect(nextPollAt.getTime()).toBe(1_700_000_030_000);
    });

    it('floors negative delays to zero', () => {
      const { nextPollAt, delayMs } = computeNextPollAt(
        { strategy: 'dynamic', next: () => -1_000 },
        baseBookkeeping(),
        undefined,
        1_000
      );
      expect(delayMs).toBe(0);
      expect(nextPollAt.getTime()).toBe(1_000);
    });
  });

  describe('applyJitter', () => {
    it('returns a value in [0.5x, 1.5x]', () => {
      const samples = Array.from({ length: 100 }, () => applyJitter(1_000));
      for (const sample of samples) {
        expect(sample).toBeGreaterThanOrEqual(500);
        expect(sample).toBeLessThanOrEqual(1_500);
      }
    });
  });

  describe('enforceCeilings', () => {
    it('returns ok when both ceilings are satisfied', () => {
      const result = enforceCeilings(
        { maxAttempts: 5, maxWaitMs: 60_000 },
        baseBookkeeping({ attempt: 1, startedAt: 0 }),
        5_000,
        10_000
      );
      expect(result).toEqual({ ok: true });
    });

    it('uses default ceilings when none are provided', () => {
      const result = enforceCeilings(undefined, baseBookkeeping({ attempt: 1 }), 5_000, 10_000);
      expect(result).toEqual({ ok: true });
    });

    it('breaches when attempt has reached maxAttempts', () => {
      const result = enforceCeilings(
        { maxAttempts: 3, maxWaitMs: 60_000 },
        baseBookkeeping({ attempt: 3, startedAt: 0 }),
        5_000,
        10_000
      );
      expect(result).toEqual({
        ok: false,
        reason: 'maxAttempts',
        attempts: 3,
        elapsedMs: 10_000,
        maxAttempts: 3,
        maxWaitMs: 60_000,
      });
    });

    it('breaches pre-emptively when next sleep would exceed maxWaitMs', () => {
      const result = enforceCeilings(
        { maxAttempts: 100, maxWaitMs: 30_000 },
        baseBookkeeping({ attempt: 4, startedAt: 0 }),
        5_000,
        29_000
      );
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.reason).toBe('maxWaitMs');
        expect(result.elapsedMs).toBe(29_000);
      }
    });
  });
});
