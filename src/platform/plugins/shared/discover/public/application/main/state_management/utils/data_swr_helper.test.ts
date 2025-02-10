/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSWRDataViewList, getSWRBoolean } from './data_swr_helper';

describe('getSWRDataViewList', () => {
  const cacheKey = 'testKey';
  const valueFn = jest.fn().mockResolvedValue([{ id: '1', title: 'Test DataView' }]);

  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should return cached value if available and call the value function in the background', async () => {
    sessionStorage.setItem(cacheKey, JSON.stringify([{ id: '1', title: 'Cached DataView' }]));
    const result = await getSWRDataViewList(cacheKey, valueFn);
    expect(result).toEqual([{ id: '1', title: 'Cached DataView' }]);
    expect(valueFn).toHaveBeenCalled();
    expect(sessionStorage.getItem(cacheKey)).toEqual(
      JSON.stringify([{ id: '1', title: 'Test DataView' }])
    );
  });

  it('should call valueFn and return its result if no cached value', async () => {
    const result = await getSWRDataViewList(cacheKey, valueFn);
    expect(result).toEqual([{ id: '1', title: 'Test DataView' }]);
    expect(valueFn).toHaveBeenCalled();
    expect(sessionStorage.getItem(cacheKey)).toEqual(
      JSON.stringify([{ id: '1', title: 'Test DataView' }])
    );
  });

  it('should return an empty array if an error occurs', async () => {
    sessionStorage.setItem(cacheKey, 'invalid JSON');
    const result = await getSWRDataViewList(cacheKey, valueFn);
    expect(result).toEqual([{ id: '1', title: 'Test DataView' }]);
  });
});

describe('getSWRBoolean', () => {
  const cacheKey = 'testBooleanKey';
  const valueFn = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    localStorage.clear();
  });

  it('should return true if cached value is available', async () => {
    localStorage.setItem(cacheKey, '1');
    const result = await getSWRBoolean(cacheKey, valueFn);
    expect(result).toBe(true);
    expect(valueFn).toHaveBeenCalled();
  });

  it('should call valueFn and return its result if no cached value', async () => {
    const result = await getSWRBoolean(cacheKey, valueFn);
    expect(result).toBe(true);
    expect(valueFn).toHaveBeenCalled();
  });

  it('should return false if an error occurs', async () => {
    localStorage.setItem(cacheKey, 'invalid');
    const result = await getSWRBoolean(cacheKey, valueFn);
    expect(result).toBe(true);
  });

  it('should return true of cache and if valueFn returned false, the cache value should be removed', async () => {
    localStorage.setItem(cacheKey, '1');
    const valueFnFalse = jest.fn().mockResolvedValue(false);
    const resultTrue = await getSWRBoolean(cacheKey, valueFnFalse);
    expect(resultTrue).toBe(true);
    const resultFalse = await getSWRBoolean(cacheKey, valueFnFalse);
    expect(resultFalse).toBe(false);
    const cachedValue = localStorage.getItem(cacheKey);
    expect(cachedValue).toBe(null);
  });
});
