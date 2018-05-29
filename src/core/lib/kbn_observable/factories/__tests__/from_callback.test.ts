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

import { $from } from '../';
import { collect } from '../../lib/collect';
import { Subject } from '../../subject';
import { $fromCallback } from '../from_callback';

test('returns raw value', async () => {
  const observable = $fromCallback(() => 'foo');
  const res = collect(observable);

  expect(await res).toEqual(['foo', 'C']);
});

test('if undefined is returned, completes immediatley', async () => {
  const observable = $fromCallback(() => undefined);
  const res = collect(observable);

  expect(await res).toEqual(['C']);
});

test('if null is returned, forwards it', async () => {
  const observable = $fromCallback(() => null);
  const res = collect(observable);

  expect(await res).toEqual([null, 'C']);
});

test('returns observable that completes immediately', async () => {
  const observable = $fromCallback(() => $from([1, 2, 3]));
  const res = collect(observable);

  expect(await res).toEqual([1, 2, 3, 'C']);
});

test('returns observable that completes later', () => {
  const subject = new Subject();

  const next = jest.fn();
  const error = jest.fn();
  const complete = jest.fn();

  $fromCallback(() => subject).subscribe(next, error, complete);

  expect(next).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();

  subject.next('foo');
  expect(next).toHaveBeenCalledTimes(1);
  expect(error).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();

  subject.complete();
  expect(error).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalledTimes(1);
});

test('handles early unsubscribe', () => {
  const subject = new Subject();

  const next = () => {
    // noop
  };
  const sub = $fromCallback(() => subject).subscribe(next);

  subject.next('foo');

  expect((subject as any).observers.size).toEqual(1);
  sub.unsubscribe();
  expect((subject as any).observers.size).toEqual(0);
});
