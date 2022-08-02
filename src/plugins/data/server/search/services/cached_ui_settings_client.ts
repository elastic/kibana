/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/server';

/**
 * {@link IUiSettingsClient} wrapper to ensure uiSettings requested only once within a single KibanaRequest,
 * {@link IUiSettingsClient} has its own cache, but it doesn't cache pending promises, so this produces two requests:
 *
 * const promise1 = uiSettings.get(1); // fetches config
 * const promise2 = uiSettings.get(2); // fetches config
 *
 * And {@link CachedUiSettingsClient} solves it, so this produced a single request:
 *
 * const promise1 = cachedUiSettingsClient.get(1); // fetches config
 * const promise2 = cachedUiSettingsClient.get(2); // reuses existing promise
 *
 * @internal
 */
export class CachedUiSettingsClient implements Pick<IUiSettingsClient, 'get'> {
  private cache: Promise<Record<string, unknown>> | undefined;

  constructor(private readonly client: IUiSettingsClient) {}

  async get<T = any>(key: string): Promise<T> {
    if (!this.cache) {
      // caching getAll() instead of just get(key) because internally uiSettings calls `getAll()` anyways
      // this way we reuse cache in case settings for different keys were requested
      this.cache = this.client.getAll();
    }

    return this.cache
      .then((cache) => cache[key] as T)
      .catch((e) => {
        this.cache = undefined;
        throw e;
      });
  }
}
