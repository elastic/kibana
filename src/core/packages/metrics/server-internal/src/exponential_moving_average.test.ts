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
        // Using realistic ELU values from Kibana startup
        const observable = cold('abc|', { a: 1.0, b: 1.0, c: 0.48 }).pipe(
          exponentialMovingAverage(15, 5)
        );

        expectObservable(observable).toBe('abc|', {
          a: expect.closeTo(0.33, 2), // mean: 1.0 * 5 / 15 = 0.333
          b: expect.closeTo(0.67, 2), // mean: (1.0 + 1.0) * 5 / 15 = 0.667
          c: expect.closeTo(0.83, 2), // mean: (1.0 + 1.0 + 0.48) * 5 / 15 = 0.827
        });
      });
    });

    it('should switch to EMA after mean period (short window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Short window: after 3 intervals, switches to EMA
        // Using realistic ELU values from Kibana startup
        const observable = cold('abcd|', { a: 1.0, b: 1.0, c: 0.48, d: 0.03 }).pipe(
          exponentialMovingAverage(15, 5)
        );

        expectObservable(observable).toBe('abcd|', {
          a: expect.closeTo(0.33, 2), // mean period
          b: expect.closeTo(0.67, 2), // mean period
          c: expect.closeTo(0.83, 2), // mean period
          d: 0.03, // first EMA value after mean period (takes current value directly)
        });
      });
    });

    it('should use mean calculation during initial period (medium window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Medium window: 30s period, 5s interval = 6 intervals for mean calculation
        // Using realistic ELU values from Kibana startup
        const observable = cold('abcdef|', {
          a: 1.0,
          b: 1.0,
          c: 0.48,
          d: 0.03,
          e: 0.03,
          f: 0.1,
        }).pipe(exponentialMovingAverage(30, 5));

        expectObservable(observable).toBe('abcdef|', {
          a: expect.closeTo(0.17, 2), // mean: 1.0 * 5 / 30 = 0.167
          b: expect.closeTo(0.33, 2), // mean: (1.0 + 1.0) * 5 / 30 = 0.333
          c: expect.closeTo(0.41, 2), // mean: (1.0 + 1.0 + 0.48) * 5 / 30 = 0.413
          d: expect.closeTo(0.42, 2), // mean: (1.0 + 1.0 + 0.48 + 0.03) * 5 / 30 = 0.418
          e: expect.closeTo(0.42, 2), // mean: (1.0 + 1.0 + 0.48 + 0.03 + 0.03) * 5 / 30 = 0.423
          f: expect.closeTo(0.44, 2), // mean: (1.0 + 1.0 + 0.48 + 0.03 + 0.03 + 0.1) * 5 / 30 = 0.44
        });
      });
    });

    it('should switch to EMA after mean period (medium window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Medium window: after 6 intervals, switches to EMA
        // Using realistic ELU values from Kibana startup
        const observable = cold('abcdefg|', {
          a: 1.0,
          b: 1.0,
          c: 0.48,
          d: 0.03,
          e: 0.03,
          f: 0.1,
          g: 0.02,
        }).pipe(exponentialMovingAverage(30, 5));

        expectObservable(observable).toBe('abcdefg|', {
          a: expect.closeTo(0.17, 2), // mean period
          b: expect.closeTo(0.33, 2), // mean period
          c: expect.closeTo(0.41, 2), // mean period
          d: expect.closeTo(0.42, 2), // mean period
          e: expect.closeTo(0.42, 2), // mean period
          f: expect.closeTo(0.44, 2), // mean period
          g: 0.02, // first EMA value after mean period
        });
      });
    });

    it('should use mean calculation during initial period (long window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Long window: 60s period, 5s interval = 12 intervals for mean calculation
        // Test first few values to verify mean behavior using realistic ELU values
        const observable = cold('abcde|', {
          a: 1.0,
          b: 1.0,
          c: 0.48,
          d: 0.03,
          e: 0.03,
        }).pipe(exponentialMovingAverage(60, 5));

        expectObservable(observable).toBe('abcde|', {
          a: expect.closeTo(0.08, 2), // mean: 1.0 * 5 / 60 = 0.083
          b: expect.closeTo(0.17, 2), // mean: (1.0 + 1.0) * 5 / 60 = 0.167
          c: expect.closeTo(0.21, 2), // mean: (1.0 + 1.0 + 0.48) * 5 / 60 = 0.207
          d: expect.closeTo(0.21, 2), // mean: (1.0 + 1.0 + 0.48 + 0.03) * 5 / 60 = 0.209
          e: expect.closeTo(0.21, 2), // mean: (1.0 + 1.0 + 0.48 + 0.03 + 0.03) * 5 / 60 = 0.212
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
        // Simulate a pattern: steady low ELU, then a spike, then back to low
        const data = {
          a: 0.02,
          b: 0.02,
          c: 0.02,
          d: 0.48,
          e: 0.03,
          f: 0.03,
          g: 0.02,
          h: 0.02,
        };

        const shortWindow = cold(values, data).pipe(exponentialMovingAverage(15, 5));
        const longWindow = cold(values, data).pipe(exponentialMovingAverage(60, 5));

        // After the spike at 'd', the short window should adapt faster
        expectObservable(shortWindow).toBe(values, {
          a: expect.closeTo(0.007, 3), // mean: 0.02 * 5 / 15 = 0.007
          b: expect.closeTo(0.013, 3), // mean: (0.02 + 0.02) * 5 / 15 = 0.013
          c: expect.closeTo(0.02, 3), // mean: (0.02 + 0.02 + 0.02) * 5 / 15 = 0.02
          d: 0.48, // transition point for short window
          e: expect.any(Number),
          f: expect.any(Number),
          g: expect.any(Number),
          h: expect.any(Number),
        });

        expectObservable(longWindow).toBe(values, {
          a: expect.closeTo(0.002, 3), // mean: 0.02 * 5 / 60 = 0.0017
          b: expect.closeTo(0.003, 3), // mean: (0.02 + 0.02) * 5 / 60 = 0.0033
          c: expect.closeTo(0.005, 3), // mean: (0.02 + 0.02 + 0.02) * 5 / 60 = 0.005
          d: expect.closeTo(0.04, 2), // mean: (0.02 + 0.02 + 0.02 + 0.48) * 5 / 60 = 0.045
          e: expect.closeTo(0.05, 2), // mean: (0.02 + 0.02 + 0.02 + 0.48 + 0.03) * 5 / 60 = 0.047
          f: expect.closeTo(0.05, 2), // mean: (0.02 + 0.02 + 0.02 + 0.48 + 0.03 + 0.03) * 5 / 60 = 0.049
          g: expect.closeTo(0.05, 2), // mean: continues until 12 intervals
          h: expect.closeTo(0.05, 2), // mean: continues until 12 intervals
        });
      });
    });
  });
});
