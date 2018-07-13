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

import { $combineLatest, $of } from '../../factories';
import { collect } from '../../lib/collect';
import { Subject } from '../../subject';

const tickMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('emits once for each combination of items', async () => {
  const foo$ = new Subject();
  const bar$ = new Subject();

  const observable = $combineLatest(foo$, bar$);
  const res = collect(observable);

  await tickMs(10);
  bar$.next('a');

  await tickMs(5);
  foo$.next(1);

  await tickMs(5);
  bar$.next('b');

  await tickMs(5);
  foo$.next(2);
  bar$.next('c');

  await tickMs(10);
  foo$.next(3);

  bar$.complete();
  foo$.complete();

  expect(await res).toEqual([[1, 'a'], [1, 'b'], [2, 'b'], [2, 'c'], [3, 'c'], 'C']);
});

test('only emits if every stream emits at least once', async () => {
  const empty$ = $of();
  const three$ = $of(1, 2, 3);

  const observable = $combineLatest(empty$, three$);
  const res = collect(observable);

  expect(await res).toEqual(['C']);
});
