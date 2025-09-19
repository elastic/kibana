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
        d: expect.closeTo(2, 2), // first EMA value after mean period
        e: expect.closeTo(1.72, 2),
        f: expect.closeTo(1.51, 2),
      });
    });
  });

  it('should fade away outdated values', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const observable = cold('abcdefghijkl|', {
        a: 1,
        b: 1,
        c: 2,
        d: 2,
        e: 1,
        f: 1,
        g: 2,
        h: 2,
        i: 1,
        j: 1,
        k: 2,
        l: 2,
      }).pipe(exponentialMovingAverage(15, 5));

      expectObservable(observable).toBe('abcdefghijkl|', {
        a: expect.closeTo(0.33, 2), // mean: 1 * 5 / 15 = 0.33
        b: expect.closeTo(0.67, 2), // mean: (1+1) * 5 / 15 = 0.67
        c: expect.closeTo(1.33, 2), // mean: (1+1+2) * 5 / 15 = 1.33
        d: expect.closeTo(2, 2), // first EMA value after mean period
        e: expect.closeTo(1.72, 2), // EMA
        f: expect.closeTo(1.51, 2), // EMA
        g: expect.closeTo(1.65, 2), // EMA
        h: expect.closeTo(1.75, 2), // EMA
        i: expect.closeTo(1.54, 2), // EMA
        j: expect.closeTo(1.39, 2), // EMA
        k: expect.closeTo(1.56, 2), // EMA
        l: expect.closeTo(1.68, 2), // EMA
      });
    });
  });
});
