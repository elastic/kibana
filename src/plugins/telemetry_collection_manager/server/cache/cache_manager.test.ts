/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CacheManager } from './cache_manager';
describe('CacheManager', () => {
  const mockCacheKey = 'mock_key';
  const mockCacheItem = 'cache_item';
  const cacheDurationMs = 10000;
  let mockNow: number;

  beforeEach(() => {
    jest.useFakeTimers('modern');
    mockNow = jest.getRealSystemTime();
    jest.setSystemTime(mockNow);
  });
  afterEach(() => jest.clearAllMocks());
  afterAll(() => jest.useRealTimers());

  test('#getFromCache returned cached object only during cache duration', () => {
    const cacheManager = new CacheManager({ cacheDurationMs });
    cacheManager.setCache(mockCacheKey, mockCacheItem);
    expect(cacheManager.getFromCache(mockCacheKey)).toEqual({
      cacheTimestamp: mockNow,
      data: mockCacheItem,
    });
    jest.advanceTimersByTime(cacheDurationMs);
    expect(cacheManager.getFromCache(mockCacheKey)).toEqual(undefined);
  });

  test('#unrefCachedObject unrefs cached objects', () => {
    const sndMockCacheKey = 'snd_mock_key';
    const cacheManager = new CacheManager({ cacheDurationMs });
    cacheManager.setCache(mockCacheKey, mockCacheItem);
    cacheManager.setCache(sndMockCacheKey, mockCacheItem);
    expect(cacheManager.getFromCache(mockCacheKey)).toEqual({
      cacheTimestamp: mockNow,
      data: mockCacheItem,
    });
    cacheManager.unrefCachedObject(mockCacheKey);
    expect(cacheManager.getFromCache(mockCacheKey)).toEqual(undefined);
    expect(cacheManager.getFromCache(sndMockCacheKey)).toEqual({
      cacheTimestamp: mockNow,
      data: mockCacheItem,
    });
  });

  test('#unrefExpiredCacheObjects unrefs all expired objects', () => {
    const sndMockCacheKey = 'snd_mock_key';
    const cacheManager = new CacheManager({ cacheDurationMs });
    cacheManager.setCache(mockCacheKey, mockCacheItem);
    cacheManager.setCache(sndMockCacheKey, mockCacheItem);
    jest.advanceTimersByTime(cacheDurationMs);
    expect(cacheManager.getFromCache(mockCacheKey)).toEqual(undefined);
    expect(cacheManager.getFromCache(sndMockCacheKey)).toEqual(undefined);
  });

  test('#isCacheValid returns true on non-expired objects', () => {
    const cacheManager = new CacheManager({ cacheDurationMs });
    cacheManager.setCache(mockCacheKey, mockCacheItem);
    expect(cacheManager.isCacheValid(mockCacheKey)).toEqual(true);
  });

  test('#isCacheValid returns false on expired objects', () => {
    const cacheManager = new CacheManager({ cacheDurationMs });
    cacheManager.setCache(mockCacheKey, mockCacheItem);
    jest.advanceTimersByTime(cacheDurationMs);
    expect(cacheManager.isCacheValid(mockCacheKey)).toEqual(false);
  });

  test('#isCacheValid returns false on non-existing objects', () => {
    const cacheManager = new CacheManager({ cacheDurationMs });
    expect(cacheManager.isCacheValid('non_existing_key')).toEqual(false);
  });
});
