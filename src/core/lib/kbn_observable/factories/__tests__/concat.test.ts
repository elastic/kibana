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

import { $concat } from '../';
import { collect } from '../../lib/collect';
import { Subject } from '../../subject';

test('continous on next observable when previous completes', async () => {
  const a = new Subject();
  const b = new Subject();

  const observable = $concat(a, b);
  const res = collect(observable);

  a.next('a1');
  b.next('b1');
  a.next('a2');
  a.complete();
  b.next('b2');
  b.complete();

  expect(await res).toEqual(['a1', 'a2', 'b2', 'C']);
});

test('errors when any observable errors', async () => {
  const a = new Subject();
  const b = new Subject();

  const observable = $concat(a, b);
  const res = collect(observable);

  const error = new Error('fail');
  a.next('a1');
  a.error(error);

  expect(await res).toEqual(['a1', error]);
});

test('handles early unsubscribe', () => {
  const a = new Subject();
  const b = new Subject();

  const next = jest.fn();
  const complete = jest.fn();
  const sub = $concat(a, b).subscribe({ next, complete });

  a.next('a1');
  sub.unsubscribe();
  a.next('a2');
  a.complete();
  b.next('b1');
  b.complete();

  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith('a1');
  expect(complete).toHaveBeenCalledTimes(0);
});
