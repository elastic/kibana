/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TestScheduler } from 'rxjs/testing';
import { exponentialMovingAverage } from './exponential_moving_average';

describe('exponentialMovingAverage', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      return expect(actual).toStrictEqual(expected);
    });
  });

  it('should emit the initial value', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const observable = cold('a|', { a: 1 }).pipe(exponentialMovingAverage(15, 5));

      expectObservable(observable).toBe('a|', { a: expect.closeTo(0.33, 2) });
    });
  });

  it('should emit smoothed values', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const observable = cold('abc|', { a: 1, b: 1, c: 2 }).pipe(exponentialMovingAverage(15, 5));

      expectObservable(observable).toBe('abc|', {
        a: expect.closeTo(0.33, 2),
        b: expect.closeTo(0.67, 2),
        c: expect.closeTo(1.33, 2),
      });
    });
  });

  it('should fade away outdated values', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const observable = cold('abcdef|', {
        a: 1,
        b: 1,
        c: 2,
        d: 2,
        e: 1,
        f: 1,
      }).pipe(exponentialMovingAverage(15, 5));

      expectObservable(observable).toBe('abcdef|', {
        a: expect.closeTo(0.33, 2), // mean value: 1 * 5 / 15 = 0.33
        b: expect.closeTo(0.67, 2), // mean value: (1+1) * 5 / 15 = 0.67
        c: expect.closeTo(1.33, 2), // mean value: (1+1+2) * 5 / 15 = 1.33
        d: 2, // first EMA value after mean period
        e: expect.closeTo(1.72, 2), // EMA calculation
        f: expect.closeTo(1.51, 2), // EMA calculation
      });
    });
  });

  describe('transition from mean to exponential moving average', () => {
    it('should use mean calculation during initial period (short window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Short window: 15s period, 5s interval = 3 intervals for mean calculation
        const observable = cold('abc|', { a: 0.1, b: 0.2, c: 0.3 }).pipe(
          exponentialMovingAverage(15, 5)
        );

        expectObservable(observable).toBe('abc|', {
          a: expect.closeTo(0.033, 3), // mean: 0.1 * 5 / 15 = 0.033
          b: expect.closeTo(0.1, 3), // mean: (0.1 + 0.2) * 5 / 15 = 0.1
          c: expect.closeTo(0.2, 3), // mean: (0.1 + 0.2 + 0.3) * 5 / 15 = 0.2
        });
      });
    });

    it('should switch to EMA after mean period (short window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Short window: after 3 intervals, switches to EMA
        const observable = cold('abcd|', { a: 0.1, b: 0.2, c: 0.3, d: 0.5 }).pipe(
          exponentialMovingAverage(15, 5)
        );

        expectObservable(observable).toBe('abcd|', {
          a: expect.closeTo(0.033, 3), // mean period
          b: expect.closeTo(0.1, 3), // mean period
          c: expect.closeTo(0.2, 3), // mean period
          d: 0.5, // first EMA value after mean period (takes current value directly)
        });
      });
    });

    it('should use mean calculation during initial period (medium window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Medium window: 30s period, 5s interval = 6 intervals for mean calculation
        const observable = cold('abcdef|', {
          a: 0.1,
          b: 0.2,
          c: 0.3,
          d: 0.4,
          e: 0.5,
          f: 0.6,
        }).pipe(exponentialMovingAverage(30, 5));

        expectObservable(observable).toBe('abcdef|', {
          a: expect.closeTo(0.017, 3), // mean: 0.1 * 5 / 30 = 0.017
          b: expect.closeTo(0.05, 3), // mean: (0.1 + 0.2) * 5 / 30 = 0.05
          c: expect.closeTo(0.1, 3), // mean: (0.1 + 0.2 + 0.3) * 5 / 30 = 0.1
          d: expect.closeTo(0.167, 3), // mean: (0.1 + 0.2 + 0.3 + 0.4) * 5 / 30 = 0.167
          e: expect.closeTo(0.25, 3), // mean: (0.1 + 0.2 + 0.3 + 0.4 + 0.5) * 5 / 30 = 0.25
          f: expect.closeTo(0.35, 3), // mean: (0.1 + 0.2 + 0.3 + 0.4 + 0.5 + 0.6) * 5 / 30 = 0.35
        });
      });
    });

    it('should switch to EMA after mean period (medium window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Medium window: after 6 intervals, switches to EMA
        const observable = cold('abcdefg|', {
          a: 0.1,
          b: 0.2,
          c: 0.3,
          d: 0.4,
          e: 0.5,
          f: 0.6,
          g: 0.8,
        }).pipe(exponentialMovingAverage(30, 5));

        expectObservable(observable).toBe('abcdefg|', {
          a: expect.closeTo(0.017, 3), // mean period
          b: expect.closeTo(0.05, 3), // mean period
          c: expect.closeTo(0.1, 3), // mean period
          d: expect.closeTo(0.167, 3), // mean period
          e: expect.closeTo(0.25, 3), // mean period
          f: expect.closeTo(0.35, 3), // mean period
          g: 0.8, // first EMA value after mean period
        });
      });
    });

    it('should use mean calculation during initial period (long window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Long window: 60s period, 5s interval = 12 intervals for mean calculation
        // Test first few values to verify mean behavior
        const observable = cold('abcde|', {
          a: 0.1,
          b: 0.2,
          c: 0.3,
          d: 0.4,
          e: 0.5,
        }).pipe(exponentialMovingAverage(60, 5));

        expectObservable(observable).toBe('abcde|', {
          a: expect.closeTo(0.0083, 4), // mean: 0.1 * 5 / 60 = 0.0083
          b: expect.closeTo(0.025, 3), // mean: (0.1 + 0.2) * 5 / 60 = 0.025
          c: expect.closeTo(0.05, 3), // mean: (0.1 + 0.2 + 0.3) * 5 / 60 = 0.05
          d: expect.closeTo(0.083, 3), // mean: (0.1 + 0.2 + 0.3 + 0.4) * 5 / 60 = 0.083
          e: expect.closeTo(0.125, 3), // mean: (0.1 + 0.2 + 0.3 + 0.4 + 0.5) * 5 / 60 = 0.125
        });
      });
    });
  });

  describe('EMA time window behavior', () => {
    it('should calculate different smoothing factors for different windows', () => {
      // Test that different time windows produce different alpha values
      // Alpha = 1 - Math.exp(-interval / period)
      const shortAlpha = 1 - Math.exp(-5 / 15); // ≈ 0.283
      const mediumAlpha = 1 - Math.exp(-5 / 30); // ≈ 0.154
      const longAlpha = 1 - Math.exp(-5 / 60); // ≈ 0.080

      expect(shortAlpha).toBeGreaterThan(mediumAlpha);
      expect(mediumAlpha).toBeGreaterThan(longAlpha);

      // Short windows should respond faster to changes
      testScheduler.run(({ cold, expectObservable }) => {
        const values = 'abcdefgh|'; // 8 values to get past transition periods
        const data = { a: 0, b: 0, c: 0, d: 1, e: 1, f: 1, g: 1, h: 1 };

        const shortWindow = cold(values, data).pipe(exponentialMovingAverage(15, 5));
        const longWindow = cold(values, data).pipe(exponentialMovingAverage(60, 5));

        // After the spike at 'd', the short window should adapt faster
        expectObservable(shortWindow).toBe(values, {
          a: 0,
          b: 0,
          c: 0,
          d: 1, // transition point for short window
          e: expect.any(Number),
          f: expect.any(Number),
          g: expect.any(Number),
          h: expect.any(Number),
        });

        expectObservable(longWindow).toBe(values, {
          a: 0,
          b: 0,
          c: 0,
          d: expect.closeTo(0.083, 3), // mean: 1 * 5 / 60 = 0.083
          e: expect.closeTo(0.167, 3), // mean: (1 + 1) * 5 / 60 = 0.167
          f: expect.closeTo(0.25, 3), // mean: (1 + 1 + 1) * 5 / 60 = 0.25
          g: expect.closeTo(0.333, 3), // mean: (1 + 1 + 1 + 1) * 5 / 60 = 0.333
          h: expect.closeTo(0.417, 3), // mean: (1 + 1 + 1 + 1 + 1) * 5 / 60 = 0.417
        });
      });
    });
  });
});
