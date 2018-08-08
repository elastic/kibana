/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable, SubscriptionObserver } from '../observable';

test('receives values when subscribed', async () => {
  let observer: SubscriptionObserver<any>;

  const source = new Observable(innerObservable => {
    observer = innerObservable;
  });

  const res: any[] = [];

  source.subscribe({
    next(x) {
      res.push(x);
    },
  });

  observer!.next('foo');
  expect(res).toEqual(['foo']);

  observer!.next('bar');
  expect(res).toEqual(['foo', 'bar']);
});

test('triggers complete when observer is completed', async () => {
  let observer: SubscriptionObserver<any>;

  const source = new Observable(innerObservable => {
    observer = innerObservable;
  });

  const complete = jest.fn();

  source.subscribe({
    complete,
  });

  observer!.complete();

  expect(complete).toHaveBeenCalledTimes(1);
});

test('should send errors thrown in the constructor down the error path', async () => {
  const err = new Error('this should be handled');

  const source = new Observable(observer => {
    throw err;
  });

  const error = jest.fn();

  source.subscribe({
    error,
  });

  expect(error).toHaveBeenCalledTimes(1);
  expect(error).toHaveBeenCalledWith(err);
});

describe('subscriptions', () => {
  test('handles multiple subscriptions and unsubscriptions', () => {
    let observers = 0;

    const source = new Observable(observer => {
      observers++;

      return () => {
        observers--;
      };
    });

    const sub1 = source.subscribe();
    expect(observers).toBe(1);

    const sub2 = source.subscribe();
    expect(observers).toBe(2);

    sub1.unsubscribe();
    expect(observers).toBe(1);

    sub2.unsubscribe();
    expect(observers).toBe(0);
  });
});

describe('Observable.from', () => {
  test('handles array', () => {
    const res: number[] = [];
    const complete = jest.fn();

    Observable.from([1, 2, 3]).subscribe({
      next(x) {
        res.push(x);
      },
      complete,
    });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(res).toEqual([1, 2, 3]);
  });

  test('handles iterable', () => {
    const fooIterable: Iterable<number> = {
      *[Symbol.iterator]() {
        yield 1;
        yield 2;
        yield 3;
      },
    };

    const res: number[] = [];
    const complete = jest.fn();

    Observable.from(fooIterable).subscribe({
      next(x) {
        res.push(x);
      },
      complete,
    });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(res).toEqual([1, 2, 3]);
  });
});

describe('Observable.of', () => {
  test('handles multiple args', () => {
    const res: number[] = [];
    const complete = jest.fn();

    Observable.of(1, 2, 3).subscribe({
      next(x) {
        res.push(x);
      },
      complete,
    });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(res).toEqual([1, 2, 3]);
  });
});
