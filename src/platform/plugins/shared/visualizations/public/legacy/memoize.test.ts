/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
