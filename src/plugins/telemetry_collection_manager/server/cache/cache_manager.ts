/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
export interface CachedObject<T = unknown> {
  data: T;
  cacheTimestamp: string;
}

export interface CacheManagerConfig {
  cacheDurationMs: number;
}

export class CacheManager {
  private readonly cachedUsage: Map<string, CachedObject> = new Map();
  private readonly cacheDurationMs: number;

  constructor({ cacheDurationMs }: CacheManagerConfig) {
    this.cacheDurationMs = cacheDurationMs;
  }

  public setCache = (cacheKey: string, data: unknown): void => {
    this.cachedUsage.set(cacheKey, { data, cacheTimestamp: moment().format() });
  };

  public isCacheValid = (cacheKey: string): boolean => {
    const cachedObject = this.cachedUsage.get(cacheKey);

    if (!cachedObject) {
      return false;
    }
    const { cacheTimestamp } = cachedObject;

    const cacheValidUntil = moment(cacheTimestamp).add(this.cacheDurationMs, 'milliseconds');
    return moment().isBefore(cacheValidUntil);
  };

  public getFromCache = <T>(cacheKey: string): CachedObject<T> | undefined => {
    const cachedObject = this.cachedUsage.get(cacheKey);
    if (!this.isCacheValid(cacheKey)) {
      return;
    }

    return cachedObject as CachedObject<T>;
  };

  public unrefCachedObject = (cacheKey: string): void => {
    this.cachedUsage.delete(cacheKey);
  };

  public unrefAllCacheObjects(): void {
    for (const cacheKey of this.cachedUsage.keys()) {
      this.unrefCachedObject(cacheKey);
    }
  }

  public unrefExpiredCacheObjects(): void {
    for (const cacheKey of this.cachedUsage.keys()) {
      if (!this.isCacheValid(cacheKey)) {
        this.unrefCachedObject(cacheKey);
      }
    }
  }
}
