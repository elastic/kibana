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

import { map, mergeMap } from '../';
import { $error, $of } from '../../factories';
import { k$ } from '../../k';
import { collect } from '../../lib/collect';
import { Observable } from '../../observable';
import { Subject } from '../../subject';

const tickMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('should mergeMap many outer values to many inner values', async () => {
  const inner$ = new Subject();

  const outer$ = Observable.from([1, 2, 3, 4]);
  const project = (value: number) => k$(inner$)(map(x => `${value}-${x}`));

  const observable = k$(outer$)(mergeMap(project));
  const res = collect(observable);

  await tickMs(10);
  inner$.next('a');

  await tickMs(10);
  inner$.next('b');

  await tickMs(10);
  inner$.next('c');

  inner$.complete();

  expect(await res).toEqual([
    '1-a',
    '2-a',
    '3-a',
    '4-a',
    '1-b',
    '2-b',
    '3-b',
    '4-b',
    '1-c',
    '2-c',
    '3-c',
    '4-c',
    'C',
  ]);
});

test('should mergeMap many outer values to many inner values, early complete', async () => {
  const outer$ = new Subject<number>();
  const inner$ = new Subject();

  const project = (value: number) => k$(inner$)(map(x => `${value}-${x}`));

  const observable = k$(outer$)(mergeMap(project));
  const res = collect(observable);

  outer$.next(1);
  outer$.next(2);
  outer$.complete();

  // This shouldn't end up in the results because `outer$` has completed.
  outer$.next(3);

  await tickMs(5);
  inner$.next('a');

  await tickMs(5);
  inner$.next('b');

  await tickMs(5);
  inner$.next('c');

  inner$.complete();

  expect(await res).toEqual(['1-a', '2-a', '1-b', '2-b', '1-c', '2-c', 'C']);
});

test('should mergeMap many outer to many inner, and inner throws', async () => {
  const source = Observable.from([1, 2, 3, 4]);
  const error = new Error('fail');

  const project = (value: number, index: number) => (index > 1 ? $error(error) : $of(value));

  const observable = k$(source)(mergeMap(project));
  const res = collect(observable);

  expect(await res).toEqual([1, 2, error]);
});

test('should mergeMap many outer to many inner, and outer throws', async () => {
  const outer$ = new Subject<number>();
  const inner$ = new Subject();

  const project = (value: number) => k$(inner$)(map(x => `${value}-${x}`));

  const observable = k$(outer$)(mergeMap(project));
  const res = collect(observable);

  outer$.next(1);
  outer$.next(2);

  const error = new Error('outer fails');

  await tickMs(5);
  inner$.next('a');

  await tickMs(5);
  inner$.next('b');

  outer$.error(error);
  // This shouldn't end up in the results because `outer$` has failed
  outer$.next(3);

  await tickMs(5);
  inner$.next('c');

  expect(await res).toEqual(['1-a', '2-a', '1-b', '2-b', error]);
});

test('should mergeMap many outer to an array for each value', async () => {
  const source = Observable.from([1, 2, 3]);

  const observable = k$(source)(mergeMap(() => $of('a', 'b', 'c')));
  const res = collect(observable);

  expect(await res).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c', 'C']);
});
