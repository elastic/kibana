/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSWRDataViewList, getSWRBoolean } from './data_swr_helper';
import { discoverServiceMock } from '../../../../__mocks__/services';

describe('getSWRDataViewList', () => {
  const cacheKey = 'testKey';
  const valueFn = jest.fn().mockResolvedValue([{ id: '1', title: 'Test DataView' }]);
  const storage = discoverServiceMock.sessionStorage;

  beforeEach(() => {
    storage.clear();
  });

  it('should return cached value if available and call the value function in the background', async () => {
    storage.set(cacheKey, [{ id: '1', title: 'Cached DataView' }]);
    const result = await getSWRDataViewList(cacheKey, valueFn, storage);
    expect(result).toEqual([{ id: '1', title: 'Cached DataView' }]);
    expect(valueFn).toHaveBeenCalled();
    expect(storage.get(cacheKey)).toEqual([{ id: '1', title: 'Test DataView' }]);
  });

  it('should call valueFn and return its result if no cached value', async () => {
    const result = await getSWRDataViewList(cacheKey, valueFn, storage);
    expect(result).toEqual([{ id: '1', title: 'Test DataView' }]);
    expect(valueFn).toHaveBeenCalled();
    expect(storage.get(cacheKey)).toEqual([{ id: '1', title: 'Test DataView' }]);
  });

  it('should return an empty array if an error occurs', async () => {
    storage.set(cacheKey, 'invalid JSON');
    const result = await getSWRDataViewList(cacheKey, valueFn, storage);
    expect(result).toEqual([{ id: '1', title: 'Test DataView' }]);
  });
});

describe('getSWRBoolean', () => {
  const cacheKey = 'testBooleanKey';
  const valueFn = jest.fn().mockResolvedValue(true);
  const storage = discoverServiceMock.storage;

  beforeEach(() => {
    storage.clear();
  });

  it('should return true if cached value is available', async () => {
    storage.set(cacheKey, '1');
    const result = await getSWRBoolean(cacheKey, valueFn, storage);
    expect(result).toBe(true);
    expect(valueFn).toHaveBeenCalled();
  });

  it('should set localstorage key to 1, if the valueFn returns true ', async () => {
    const result = await getSWRBoolean(cacheKey, valueFn, storage);
    expect(result).toBe(true);
    expect(storage.get(cacheKey)).toBe('1');
  });

  it('should call valueFn and return its result if no cached value', async () => {
    const result = await getSWRBoolean(cacheKey, valueFn, storage);
    expect(result).toBe(true);
    expect(valueFn).toHaveBeenCalled();
  });

  it('should return false if an error occurs', async () => {
    storage.set(cacheKey, 'invalid');
    const result = await getSWRBoolean(cacheKey, valueFn, storage);
    expect(result).toBe(true);
  });

  it('should return true of cache and if valueFn returned false, the cache value should be removed', async () => {
    storage.set(cacheKey, '1');
    const valueFnFalse = jest.fn().mockResolvedValue(false);
    const resultTrue = await getSWRBoolean(cacheKey, valueFnFalse, storage);
    expect(resultTrue).toBe(true);
    const resultFalse = await getSWRBoolean(cacheKey, valueFnFalse, storage);
    expect(resultFalse).toBe(false);
    const cachedValue = storage.get(cacheKey);
    expect(cachedValue).toBe(null);
  });
});
