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

  it('should emit the initial value as mean', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const observable = cold('a|', { a: 1 }).pipe(exponentialMovingAverage(15, 5));

      expectObservable(observable).toBe('a|', { a: expect.closeTo(0.3, 1) });
    });
  });

  it('should emit smoothed values', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const observable = cold('abcdefg|', { a: 1, b: 1, c: 1, d: 1, e: 2, f: 2, g: 1 }).pipe(
        exponentialMovingAverage(15, 5)
      );

      expectObservable(observable).toBe('abcdefg|', {
        a: expect.closeTo(0.3, 1), // mean([0, 0, 1]) = 0.33
        b: expect.closeTo(0.7, 1), // mean([0, 1, 1]) = 0.67
        c: 1, // mean([1, 1, 1]) = 1
        d: 1, // ~EMA([1, 1, 1]) = 1
        e: expect.closeTo(1.3, 1), // ~EMA([1, 1, 2]) = 1.3
        f: expect.closeTo(1.5, 1), // ~EMA([1, 2, 2]) = 1.5
        g: expect.closeTo(1.3, 1), // ~EMA([2, 2, 1]) = 1.3
      });
    });
  });

  it('should fade away outdated values', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const observable = cold('abcdefghij|', {
        a: 1,
        b: 1,
        c: 1,
        d: 1,
        e: 2,
        f: 2,
        g: 1,
        h: 1,
        i: 2,
        j: 2,
      }).pipe(exponentialMovingAverage(15, 5));

      expectObservable(observable).toBe('abcdefghij|', {
        a: expect.closeTo(0.3, 1), // mean([0, 0, 1]) = 0.33
        b: expect.closeTo(0.7, 1), // mean([0, 1, 1]) = 0.67
        c: 1, // mean([1, 1, 1]) = 1
        d: 1, // ~EMA([1, 1, 1]) = 1
        e: expect.closeTo(1.3, 1), // ~EMA([1, 1, 2]) = ~1.3
        f: expect.closeTo(1.5, 1), // ~EMA([1, 2, 2]) = ~1.5
        g: expect.closeTo(1.3, 1), // ~EMA([2, 2, 1]) = ~1.3
        h: expect.closeTo(1.2, 1), // ~EMA([2, 1, 1]) = ~1.2
        i: expect.closeTo(1.5, 1), // ~EMA([1, 1, 2]) = ~1.5
        j: expect.closeTo(1.6, 1), // ~EMA([1, 2, 2]) = ~1.6
      });
    });
  });
});
