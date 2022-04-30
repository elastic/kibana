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

  it('caches object for the cache duration only', () => {
    const cacheManager = new CacheManager({ cacheDurationMs });
    cacheManager.setCache(mockCacheKey, mockCacheItem);
    expect(cacheManager.getFromCache(mockCacheKey)).toEqual(mockCacheItem);
    jest.advanceTimersByTime(cacheDurationMs + 100);
    expect(cacheManager.getFromCache(mockCacheKey)).toEqual(undefined);
  });

  it('#resetCache removes cached objects', () => {
    const cacheManager = new CacheManager({ cacheDurationMs });
    cacheManager.setCache(mockCacheKey, mockCacheItem);
    expect(cacheManager.getFromCache(mockCacheKey)).toEqual(mockCacheItem);
    cacheManager.resetCache();
    expect(cacheManager.getFromCache(mockCacheKey)).toEqual(undefined);
  });
});
