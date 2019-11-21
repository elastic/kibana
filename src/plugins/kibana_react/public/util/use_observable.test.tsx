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

import { renderHook, act } from 'react-hooks-testing-library';
import { Subject } from 'rxjs';
import { useObservable } from './use_observable';

test('default initial value is undefined', () => {
  const subject$ = new Subject();
  const { result } = renderHook(() => useObservable(subject$));

  expect(result.current).toBe(undefined);
});

test('can specify initial value', () => {
  const subject$ = new Subject();
  const { result } = renderHook(() => useObservable(subject$, 123));

  expect(result.current).toBe(123);
});

test('returns the latest value of observables', () => {
  const subject$ = new Subject();
  const { result } = renderHook(() => useObservable(subject$, 123));

  act(() => {
    subject$.next(125);
  });
  expect(result.current).toBe(125);

  act(() => {
    subject$.next(300);
    subject$.next(400);
  });
  expect(result.current).toBe(400);
});

xtest('subscribes to observable only once', () => {});
