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
  // extend existing tests by prepending more values (combined with longer windows) to test the transition more thoroughly
  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      return expect(actual).toStrictEqual(expected);
    });
  });

  it('should emit the initial value as mean', () => {
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
        a: expect.closeTo(0.33, 2), // mean: 1 * 5 / 15 = 0.33
        b: expect.closeTo(0.67, 2), // mean: (1+1) * 5 / 15 = 0.67
        c: expect.closeTo(1.33, 2), // mean: (1+1+2) * 5 / 15 = 1.33
        d: 2, // first EMA value after mean period
        e: expect.closeTo(1.72, 2), // EMA
        f: expect.closeTo(1.51, 2), // EMA
      });
    });
  });
  // remove
  describe('transition from mean to exponential moving average', () => {
    // Using realistic ELU values from Kibana startup
    // TODO: change inputs back to originally used values: { a: 1, b: 1, c: 2, d: 2, e: 1, f: 1} for easier maths
    it('should switch to EMA after mean period (short window)', () => {
      // Short window: after 3 intervals, switches to EMA
      testScheduler.run(({ cold, expectObservable }) => {
        // change inputs back to originally used values: { a: 1, b: 1, c: 2, d: 2, e: 1, f: 1}
        const observable = cold('abcd|', { a: 1.0, b: 1.0, c: 0.48, d: 0.03 }).pipe(
          exponentialMovingAverage(15, 5)
        );

        expectObservable(observable).toBe('abcd|', {
          a: expect.closeTo(0.33, 2), // mean: 1.0 * 5 / 15 = 0.333
          b: expect.closeTo(0.67, 2), // mean: (1.0 + 1.0) * 5 / 15 = 0.667
          c: expect.closeTo(0.83, 2), // mean: (1.0 + 1.0 + 0.48) * 5 / 15 = 0.827
          d: 0.03, // first EMA value after mean period (takes current value directly)
        });
      });
    });

    it('should switch to EMA after mean period (medium window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Medium window: after 6 intervals, switches to EMA
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
          a: expect.closeTo(0.17, 2),
          b: expect.closeTo(0.33, 2),
          c: expect.closeTo(0.41, 2),
          d: expect.closeTo(0.42, 2),
          e: expect.closeTo(0.42, 2),
          f: expect.closeTo(0.44, 2),
          g: 0.02, // first EMA value after mean period
        });
      });
    });

    it('should switch to EMA after mean period (long window)', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        // Long window: 60s period, 5s interval = 12 intervals for mean calculation
        // Use 14 values to test the switch
        const observable = cold('abcdefghijklmn|', {
          a: 1.0,
          b: 1.0,
          c: 0.48,
          d: 0.03,
          e: 0.03,
          f: 0.1,
          g: 0.02,
          h: 0.05,
          i: 0.04,
          j: 0.06,
          k: 0.03,
          l: 0.02,
          m: 0.1, // first EMA calculation
          n: 0.05, // second EMA calculation
        }).pipe(exponentialMovingAverage(60, 5));

        expectObservable(observable).toBe('abcdefghijklmn|', {
          // First 12 values use mean calculation
          a: expect.closeTo(0.083, 3), // mean: 1.0 * 5 / 60 = 0.083
          b: expect.closeTo(0.167, 3), // mean: (1.0 + 1.0) * 5 / 60 = 0.167
          c: expect.closeTo(0.207, 3), // mean: (1.0 + 1.0 + 0.48) * 5 / 60 = 0.207
          d: expect.closeTo(0.209, 3), // mean continues...
          e: expect.closeTo(0.212, 3),
          f: expect.closeTo(0.22, 2),
          g: expect.closeTo(0.222, 3),
          h: expect.closeTo(0.226, 3),
          i: expect.closeTo(0.229, 3),
          j: expect.closeTo(0.234, 3),
          k: expect.closeTo(0.237, 3),
          l: expect.closeTo(0.238, 3),
          // 13th value switches to EMA - takes current value directly
          m: 0.1,
          // 14th value uses EMA calculation
          n: expect.closeTo(0.096, 3), // EMA with alpha ≈ 0.080
        });
      });
    });
  });
  // remove
  describe('EMA time window behavior', () => {
    it('should calculate different smoothing factors for different windows', () => {
      const shortAlpha = 1 - Math.exp(-5 / 15); // ≈ 0.283
      const mediumAlpha = 1 - Math.exp(-5 / 30); // ≈ 0.154
      const longAlpha = 1 - Math.exp(-5 / 60); // ≈ 0.080

      expect(shortAlpha).toBeGreaterThan(mediumAlpha);
      expect(mediumAlpha).toBeGreaterThan(longAlpha);

      // Short windows should respond faster to changes
      testScheduler.run(({ cold, expectObservable }) => {
        const values = 'abcdefgh|'; // 8 values to get past switch periods
        // Simulate steady low ELU, then a spike, then back to low
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
          d: 0.48, // switch point for short window
          e: expect.closeTo(0.352, 3), // EMA: alpha=0.283, previous=0.48, current=0.03
          f: expect.closeTo(0.261, 3), // EMA: alpha=0.283, previous=0.352, current=0.03
          g: expect.closeTo(0.193, 3), // EMA: alpha=0.283, previous=0.261, current=0.02
          h: expect.closeTo(0.144, 3), // EMA: alpha=0.283, previous=0.193, current=0.02
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
