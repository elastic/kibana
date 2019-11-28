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

import { renderHook } from '@testing-library/react-hooks';
import { useShallowCompareEffect } from './use_shallow_compare_effect';

describe('useShallowCompareEffect', () => {
  test("doesn't run effect on shallow change", () => {
    const callback = jest.fn();
    let deps = [1, { a: 'b' }, true];
    const { rerender } = renderHook(() => useShallowCompareEffect(callback, deps));

    expect(callback).toHaveBeenCalledTimes(1);
    callback.mockClear();

    // no change
    rerender();
    expect(callback).toHaveBeenCalledTimes(0);
    callback.mockClear();

    // no-change (new object with same properties)
    deps = [1, { a: 'b' }, true];
    rerender();
    expect(callback).toHaveBeenCalledTimes(0);
    callback.mockClear();

    // change (new primitive value)
    deps = [2, { a: 'b' }, true];
    rerender();
    expect(callback).toHaveBeenCalledTimes(1);
    callback.mockClear();

    // no-change
    rerender();
    expect(callback).toHaveBeenCalledTimes(0);
    callback.mockClear();

    // change (new primitive value)
    deps = [1, { a: 'b' }, false];
    rerender();
    expect(callback).toHaveBeenCalledTimes(1);
    callback.mockClear();

    // change (new properties on object)
    deps = [1, { a: 'c' }, false];
    rerender();
    expect(callback).toHaveBeenCalledTimes(1);
    callback.mockClear();
  });

  test('runs effect on deep change', () => {
    const callback = jest.fn();
    let deps = [1, { a: { b: 'c' } }, true];
    const { rerender } = renderHook(() => useShallowCompareEffect(callback, deps));

    expect(callback).toHaveBeenCalledTimes(1);
    callback.mockClear();

    // no change
    rerender();
    expect(callback).toHaveBeenCalledTimes(0);
    callback.mockClear();

    // change (new nested object )
    deps = [1, { a: { b: 'c' } }, true];
    rerender();
    expect(callback).toHaveBeenCalledTimes(1);
    callback.mockClear();
  });
});
