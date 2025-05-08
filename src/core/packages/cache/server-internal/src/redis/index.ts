/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createClient, RedisClientType } from 'redis';
import type { CacheClient } from '../cache_client';
import type { CacheConfig } from '../config';

export class RedisCacheClient implements CacheClient {
  private client: RedisClientType;

  constructor({ client: { url } }: CacheConfig) {
    this.client = createClient({ url });
    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });
  }

  /**
   * Connects to the Redis server.
   */
  public async connect(): Promise<void> {
    await this.client.connect();
  }

  public async disconnect(): Promise<void> {
    await this.client.close();
  }

  public async get(key: string): Promise<string | undefined> {
    const result = await this.client.get(key);
    return result ?? undefined;
  }

  public async set(
    key: string,
    value: string,
    options?: { EX?: number; PX?: number }
  ): Promise<void> {
    await this.client.set(key, value, options);
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  public async flushAll(): Promise<void> {
    await this.client.flushAll();
  }

  public async quit(): Promise<void> {
    await this.client.quit();
  }
}
