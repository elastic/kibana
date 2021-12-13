/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import LRUCache from 'lru-cache';

export interface CacheManagerConfig {
  cacheDurationMs: number;
}

export class CacheManager {
  private readonly cache: LRUCache<string, unknown>;

  constructor({ cacheDurationMs }: CacheManagerConfig) {
    this.cache = new LRUCache({
      max: 1,
      maxAge: cacheDurationMs,
    });
  }

  public setCache = (cacheKey: string, data: unknown): void => {
    this.cache.set(cacheKey, data);
  };

  public getFromCache = <T = unknown>(cacheKey: string): T | undefined => {
    return this.cache.get(cacheKey) as T;
  };

  public unrefAllCacheObjects(): void {
    this.cache.reset();
  }
}
