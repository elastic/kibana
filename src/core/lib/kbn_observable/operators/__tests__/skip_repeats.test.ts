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

import { skipRepeats } from '../';
import { $of } from '../../factories';
import { k$ } from '../../k';
import { collect } from '../../lib/collect';
import { Observable } from '../../observable';
import { Subject } from '../../subject';

test('should distinguish between values', async () => {
  const values$ = new Subject<string>();

  const observable = k$(values$)(skipRepeats());
  const res = collect(observable);

  values$.next('a');
  values$.next('a');
  values$.next('a');
  values$.next('b');
  values$.next('b');
  values$.next('a');
  values$.next('a');
  values$.complete();

  expect(await res).toEqual(['a', 'b', 'a', 'C']);
});

test('should distinguish between values and does not complete', () => {
  const values$ = new Subject<string>();

  const actual: any[] = [];
  k$(values$)(skipRepeats()).subscribe({
    next(v) {
      actual.push(v);
    },
  });

  values$.next('a');
  values$.next('a');
  values$.next('a');
  values$.next('b');
  values$.next('b');
  values$.next('a');
  values$.next('a');

  expect(actual).toEqual(['a', 'b', 'a']);
});

test('should complete if source is empty', done => {
  const values$ = $of();

  k$(values$)(skipRepeats()).subscribe({
    complete: done,
  });
});

test('should emit if source emits single element only', () => {
  const values$ = new Subject<string>();

  const actual: any[] = [];
  k$(values$)(skipRepeats()).subscribe({
    next(x) {
      actual.push(x);
    },
  });

  values$.next('a');

  expect(actual).toEqual(['a']);
});

test('should emit if source is scalar', () => {
  const values$ = $of('a');

  const actual: any[] = [];
  k$(values$)(skipRepeats()).subscribe({
    next(v) {
      actual.push(v);
    },
  });

  expect(actual).toEqual(['a']);
});

test('should raise error if source raises error', async () => {
  const values$ = new Subject<string>();

  const observable = k$(values$)(skipRepeats());
  const res = collect(observable);

  values$.next('a');
  values$.next('a');

  const thrownError = new Error('nope');
  values$.error(thrownError);

  expect(await res).toEqual(['a', thrownError]);
});

test('should raise error if source throws', () => {
  const thrownError = new Error('fail');

  const obs = new Observable(observer => {
    observer.error(thrownError);
  });

  const error = jest.fn();
  k$(obs)(skipRepeats()).subscribe({
    error,
  });

  expect(error).toHaveBeenCalledWith(thrownError);
});

test('should allow unsubscribing early and explicitly', () => {
  const values$ = new Subject<string>();

  const actual: any[] = [];
  const sub = k$(values$)(skipRepeats()).subscribe({
    next(v) {
      actual.push(v);
    },
  });

  values$.next('a');
  values$.next('a');
  values$.next('b');

  sub.unsubscribe();

  values$.next('c');
  values$.next('d');

  expect(actual).toEqual(['a', 'b']);
});

test('should emit once if comparator returns true always regardless of source emits', () => {
  const values$ = new Subject<string>();

  const actual: any[] = [];
  k$(values$)(skipRepeats(() => true)).subscribe({
    next(v) {
      actual.push(v);
    },
  });

  values$.next('a');
  values$.next('a');
  values$.next('b');
  values$.next('c');

  expect(actual).toEqual(['a']);
});

test('should emit all if comparator returns false always regardless of source emits', () => {
  const values$ = new Subject<string>();

  const actual: any[] = [];
  k$(values$)(skipRepeats(() => false)).subscribe({
    next(v) {
      actual.push(v);
    },
  });

  values$.next('a');
  values$.next('a');
  values$.next('a');
  values$.next('a');

  expect(actual).toEqual(['a', 'a', 'a', 'a']);
});

test('should distinguish values by comparator', () => {
  const values$ = new Subject<number>();

  const comparator = (x: number, y: number) => y % 2 === 0;

  const actual: any[] = [];
  k$(values$)(skipRepeats(comparator)).subscribe({
    next(v) {
      actual.push(v);
    },
  });

  values$.next(1);
  values$.next(2);
  values$.next(3);
  values$.next(4);

  expect(actual).toEqual([1, 3]);
});
