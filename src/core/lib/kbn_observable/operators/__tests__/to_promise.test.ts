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

import { toPromise } from '../';
import { k$ } from '../../k';
import { Subject } from '../../subject';

// Promises are always async, so we add a simple helper that we can `await` to
// make sure they have completed.
const tick = () => Promise.resolve();

test('returns the last value', async () => {
  const values$ = new Subject();

  const resolved = jest.fn();
  const rejected = jest.fn();

  k$(values$)(toPromise()).then(resolved, rejected);

  values$.next('foo');
  await tick();

  expect(resolved).not.toHaveBeenCalled();
  expect(rejected).not.toHaveBeenCalled();

  values$.next('bar');
  await tick();

  expect(resolved).not.toHaveBeenCalled();
  expect(rejected).not.toHaveBeenCalled();

  values$.complete();
  await tick();

  expect(resolved).toHaveBeenCalledTimes(1);
  expect(resolved).toHaveBeenCalledWith('bar');
  expect(rejected).not.toHaveBeenCalled();
});

test('resolves even if no values received', async () => {
  const values$ = new Subject();

  const resolved = jest.fn();
  const rejected = jest.fn();

  k$(values$)(toPromise()).then(resolved, rejected);

  values$.complete();
  await tick();

  expect(rejected).not.toHaveBeenCalled();
  expect(resolved).toHaveBeenCalledTimes(1);
});

test('rejects if error received', async () => {
  const values$ = new Subject();

  const resolved = jest.fn();
  const rejected = jest.fn();

  k$(values$)(toPromise()).then(resolved, rejected);

  values$.error(new Error('fail'));
  await tick();

  expect(resolved).not.toHaveBeenCalled();
  expect(rejected).toHaveBeenCalledTimes(1);
  expect(rejected.mock.calls).toMatchSnapshot();
});
