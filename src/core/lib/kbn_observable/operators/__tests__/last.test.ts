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

import { last } from '../';
import { k$ } from '../../k';
import { Subject } from '../../subject';

test('returns the last value', async () => {
  const values$ = new Subject();

  const next = jest.fn();
  const error = jest.fn();
  const complete = jest.fn();

  k$(values$)(last()).subscribe(next, error, complete);

  values$.next('foo');
  expect(next).not.toHaveBeenCalled();

  values$.next('bar');
  expect(next).not.toHaveBeenCalled();

  values$.complete();

  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith('bar');
  expect(error).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalledTimes(1);
});

test('returns error if completing without receiving any value', async () => {
  const values$ = new Subject();

  const error = jest.fn();

  k$(values$)(last()).subscribe({
    error,
  });

  values$.complete();

  expect(error).toHaveBeenCalledTimes(1);
  expect(error.mock.calls).toMatchSnapshot();
});
