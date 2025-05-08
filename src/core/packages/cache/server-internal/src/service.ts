/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { IConfigService } from '@kbn/config';
import type { CacheStorage } from '@kbn/core-cache-server';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { firstValueFrom } from 'rxjs';
import { RedisCacheClient } from './redis';
import { CacheConfig } from './config';
import { CacheClient } from './cache_client';

export class CacheService {
  private configService: IConfigService;
  private client: CacheClient | undefined;
  private cache: CacheStorage | undefined;
  constructor(core: CoreContext) {
    this.configService = core.configService;
  }
  /**
   * Sets up the cache service. This method is called during the initialization phase.
   */
  public async setup() {
    // Perform any setup tasks here
    // For example, you might want to initialize a cache client or perform validation
    // on the configuration.
    const config = await firstValueFrom(this.configService.atPath<CacheConfig>('cache'));
    if (!config) {
      return {};
    }
    this.client = new RedisCacheClient(config);
    try {
      await this.client.connect();
    } catch (error) {
      throw new Error(`Failed to connect to Redis server: ${error}`);
    }
    this.cache = {
      get: async (key: string) => {
        return this.client!.get(key);
      },
      set: async (key: string, value: string, ttl?: number) => {
        await this.client!.set(key, value, { EX: ttl });
      },
      delete: async (key: string) => {
        await this.client!.del(key);
      },
      has: async (key: string) => {
        return this.client!.exists(key);
      },
      clear: async () => {
        await this.client!.flushAll();
      },
    };
    return {
      store: this.cache,
    };
  }

  /**
   * Starts the cache service. This method is called when the service is ready to be used.
   */
  public start() {
    return {
      store: this.cache,
    };
  }

  /**
   * Stops the cache service. This method is called during the shutdown phase.
   */
  public async stop(): Promise<void> {
    await this.client?.disconnect();
  }
}
