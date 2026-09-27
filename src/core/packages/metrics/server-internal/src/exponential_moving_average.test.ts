/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject, type TimestampProvider } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { createExponentialMovingAverage } from './exponential_moving_average';

const period = 15;
const interval = 5;

const createClock = (start = 0): { clock: TimestampProvider; advance: (ms: number) => void } => {
  let now = start;

  return {
    clock: {
      now: () => now,
    },
    advance: (ms: number) => {
      now += ms;
    },
  };
};

describe('createExponentialMovingAverage (ema)', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      return expect(actual).toStrictEqual(expected);
    });
  });

  it('should emit the initial value as mean', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const observable = cold('a|', { a: 1 }).pipe(
        createExponentialMovingAverage('ema', period, interval)
      );

      expectObservable(observable).toBe('a|', { a: expect.closeTo(0.3, 1) });
    });
  });

  it('should emit smoothed values', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const observable = cold('abcdefg|', { a: 1, b: 1, c: 1, d: 1, e: 2, f: 2, g: 1 }).pipe(
        createExponentialMovingAverage('ema', period, interval)
      );

      expectObservable(observable).toBe('abcdefg|', {
        a: expect.closeTo(0.3, 1),
        b: expect.closeTo(0.7, 1),
        c: 1,
        d: 1,
        e: expect.closeTo(1.3, 1),
        f: expect.closeTo(1.5, 1),
        g: expect.closeTo(1.3, 1),
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
      }).pipe(createExponentialMovingAverage('ema', period, interval));

      expectObservable(observable).toBe('abcdefghij|', {
        a: expect.closeTo(0.3, 1),
        b: expect.closeTo(0.7, 1),
        c: 1,
        d: 1,
        e: expect.closeTo(1.3, 1),
        f: expect.closeTo(1.5, 1),
        g: expect.closeTo(1.3, 1),
        h: expect.closeTo(1.2, 1),
        i: expect.closeTo(1.5, 1),
        j: expect.closeTo(1.6, 1),
      });
    });
  });
});

describe('createExponentialMovingAverage (time-weighted-ema)', () => {
  it('should emit the initial value as mean', () => {
    const { clock } = createClock();
    const results: number[] = [];
    const subject = new Subject<number>();

    subject
      .pipe(createExponentialMovingAverage('time-weighted-ema', period, interval, clock))
      .subscribe((value) => {
        results.push(value);
      });

    subject.next(1);
    subject.complete();

    expect(results).toEqual([expect.closeTo(1 / 3, 2)]);
  });

  it('should emit smoothed values at a fixed cadence', () => {
    const { clock, advance } = createClock();
    const results: number[] = [];
    const subject = new Subject<number>();

    subject
      .pipe(createExponentialMovingAverage('time-weighted-ema', period, interval, clock))
      .subscribe((value) => {
        results.push(value);
      });

    for (const value of [1, 1, 1, 1, 2, 2, 1]) {
      subject.next(value);
      advance(interval);
    }
    subject.complete();

    expect(results).toEqual([
      expect.closeTo(0.3, 1),
      expect.closeTo(0.7, 1),
      1,
      1,
      expect.closeTo(1.3, 1),
      expect.closeTo(1.5, 1),
      expect.closeTo(1.3, 1),
    ]);
  });

  it('should weight a long gap proportionally to elapsed time', () => {
    const { clock, advance } = createClock();
    const results: number[] = [];
    const subject = new Subject<number>();

    subject
      .pipe(createExponentialMovingAverage('time-weighted-ema', period, interval, clock))
      .subscribe((value) => {
        results.push(value);
      });

    for (const value of [1, 1, 1]) {
      subject.next(value);
      advance(interval);
    }
    subject.next(1);
    advance(period);
    subject.next(0);
    subject.complete();

    const alphaAfterLongGap = 1 - Math.exp(-period / period);
    const expectedAfterGap = alphaAfterLongGap * 0 + (1 - alphaAfterLongGap) * 1;

    expect(results).toEqual([
      expect.closeTo(0.3, 1),
      expect.closeTo(0.7, 1),
      1,
      1,
      expect.closeTo(expectedAfterGap, 2),
    ]);
  });

  it('should treat back-to-back samples as zero elapsed time in smoothing', () => {
    const { clock, advance } = createClock();
    const results: number[] = [];
    const subject = new Subject<number>();

    subject
      .pipe(createExponentialMovingAverage('time-weighted-ema', period, interval, clock))
      .subscribe((value) => {
        results.push(value);
      });

    for (const value of [1, 1, 1]) {
      subject.next(value);
      advance(interval);
    }

    subject.next(1);
    subject.next(0.5);
    subject.next(0.5);
    subject.complete();

    expect(results).toEqual([expect.closeTo(0.3, 1), expect.closeTo(0.7, 1), 1, 1, 1, 1]);
  });

  it('matches ema at a fixed cadence', () => {
    const { clock, advance } = createClock();
    const emaResults: number[] = [];
    const timeWeightedResults: number[] = [];
    const values = [1, 1, 1, 1, 2, 2, 1];

    const emaSubject = new Subject<number>();
    emaSubject
      .pipe(createExponentialMovingAverage('ema', period, interval))
      .subscribe((value) => emaResults.push(value));

    const timeWeightedSubject = new Subject<number>();
    timeWeightedSubject
      .pipe(createExponentialMovingAverage('time-weighted-ema', period, interval, clock))
      .subscribe((value) => timeWeightedResults.push(value));

    for (const value of values) {
      emaSubject.next(value);
      timeWeightedSubject.next(value);
      advance(interval);
    }

    expect(timeWeightedResults).toEqual(emaResults);
  });
});
