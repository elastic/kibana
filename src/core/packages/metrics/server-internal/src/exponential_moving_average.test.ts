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

      expectObservable(observable).toBe('a|', { a: 1 });
    });
  });

  it('should emit smoothed values', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const observable = cold('abc|', { a: 1, b: 1, c: 2 }).pipe(exponentialMovingAverage(15, 5));

      expectObservable(observable).toBe('abc|', {
        a: 1,
        b: 1,
        c: expect.closeTo(1.3, 1),
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
        a: 1, // https://en.wikipedia.org/wiki/Exponential_smoothing#Choosing_the_initial_smoothed_value
        b: 1,
        c: expect.closeTo(1.3, 1),
        d: expect.closeTo(1.5, 1),
        e: expect.closeTo(1.3, 1),
        f: expect.closeTo(1.2, 1),
      });
    });
  });
});
