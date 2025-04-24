/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CacheManager } from './cache_manager';

describe('CacheManager', () => {
  const mockCacheKey = 'mock_key';
  const mockCacheItem = 'cache_item';
  const cacheDurationMs = 1000;

  afterEach(() => jest.clearAllMocks());

  it('caches object for the cache duration only', async () => {
    const cacheManager = new CacheManager({ cacheDurationMs });
    cacheManager.setCache(mockCacheKey, mockCacheItem);
    expect(cacheManager.getFromCache(mockCacheKey)).toEqual(mockCacheItem);
    // Cannot get `jest.FakeTimers` to work with LRUCache
    await new Promise((resolve) => setTimeout(resolve, cacheDurationMs + 100));
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
