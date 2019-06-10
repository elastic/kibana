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

import { memoizeLast } from './memoize';

describe('memoizeLast', () => {
  type SumFn = (a: number, b: number) => number;
  let originalSum: SumFn;
  let memoizedSum: SumFn;

  beforeEach(() => {
    originalSum = jest.fn((a, b) => a + b);
    memoizedSum = memoizeLast(originalSum);
  });

  it('should call through function', () => {
    expect(memoizedSum(26, 16)).toBe(42);
    expect(originalSum).toHaveBeenCalledWith(26, 16);
  });

  it('should memoize the last call', () => {
    memoizedSum(26, 16);
    expect(originalSum).toHaveBeenCalledTimes(1);
    memoizedSum(26, 16);
    expect(originalSum).toHaveBeenCalledTimes(1);
  });

  it('should use parameters as cache keys', () => {
    expect(memoizedSum(26, 16)).toBe(42);
    expect(originalSum).toHaveBeenCalledTimes(1);
    expect(memoizedSum(16, 26)).toBe(42);
    expect(originalSum).toHaveBeenCalledTimes(2);
  });
});
