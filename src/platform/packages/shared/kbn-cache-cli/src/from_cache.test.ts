/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromCache } from './from_cache';
import type { Cache } from 'cache-manager';

function createMockCache(): { store: Map<string, unknown>; cache: Cache } {
  const backing = new Map<string, unknown>();
  const cache = {
    get: jest.fn(async (key: string) => backing.get(key)),
    set: jest.fn(async (key: string, value: unknown) => {
      backing.set(key, value);
    }),
  } as Partial<Cache>;
  return { store: backing, cache: cache as Cache };
}

describe('fromCache', () => {
  const KEY = 'test-key';
  const NEW_VAL = 'fresh-value';

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.DISABLE_KBN_CLI_CACHE;
  });

  it('returns the cached value when present', async () => {
    const { cache, store } = createMockCache();
    store.set(KEY, 'cached-value');

    const cb = jest.fn().mockResolvedValue(NEW_VAL);
    const result = await fromCache(KEY, cache, cb);

    expect(result).toBe('cached-value');
    expect(cb).not.toHaveBeenCalled();
    expect(cache.get).toHaveBeenCalledWith(KEY);
    // value should not be overwritten, but invalidated
    expect(cache.set).toHaveBeenCalledWith(KEY, 'cached-value');
  });

  it('bypasses cache when DISABLE_KBN_CACHE env var is set', async () => {
    process.env.DISABLE_KBN_CLI_CACHE = 'true';
    const { cache } = createMockCache();
    const cb = jest.fn().mockResolvedValue(NEW_VAL);

    const result = await fromCache(KEY, cache, cb);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(result).toBe(NEW_VAL);

    // still updates the cache with the new value
    expect(cache.set).toHaveBeenCalledWith(KEY, NEW_VAL);
  });

  it('validates cached value with cacheValidator and recomputes when invalid', async () => {
    const { cache, store } = createMockCache();
    store.set(KEY, 'stale');

    const cb = jest.fn().mockResolvedValue(NEW_VAL);

    const validator = jest.fn((val: string) => val === 'fresh-value');

    const result = await fromCache(KEY, cache, cb, validator);

    expect(validator).toHaveBeenCalledWith('stale');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(result).toBe(NEW_VAL);
    expect(cache.set).toHaveBeenCalledWith(KEY, NEW_VAL);
  });

  it('stores newly computed value in cache when no cached value exists', async () => {
    const { cache } = createMockCache();
    const cb = jest.fn().mockResolvedValue(NEW_VAL);

    const result = await fromCache(KEY, cache, cb);

    expect(result).toBe(NEW_VAL);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith(KEY, NEW_VAL);
  });
});
