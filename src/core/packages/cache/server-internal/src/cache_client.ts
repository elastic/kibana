/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface CacheClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  /**
   * Retrieves a value from the cache by its key.
   * @param key - The key of the cached item.
   * @returns A promise resolving to the cached value or null if not found.
   */
  get(key: string): Promise<string | undefined>;

  /**
   * Stores a value in the cache with a specified key.
   * @param key - The key to associate with the cached item.
   * @param value - The value to cache.
   * @param options - Optional settings such as expiration time.
   * @returns A promise that resolves when the value is stored.
   */
  set(key: string, value: string, options?: { EX?: number; PX?: number }): Promise<void>;

  /**
   * Removes a value from the cache by its key.
   * @param key - The key of the cached item to remove.
   * @returns A promise that resolves when the value is removed.
   */
  del(key: string): Promise<void>;

  /**
   * Checks if a key exists in the cache.
   * @param key - The key to check.
   * @returns A promise resolving to the number of keys that exist (0 or 1).
   */
  exists(key: string): Promise<boolean>;

  /**
   * Clears all items from the cache.
   * @returns A promise that resolves when the cache is cleared.
   */
  flushAll(): Promise<void>;

  /**
   * Disconnects the client from the cache server.
   * @returns A promise that resolves when the client is disconnected.
   */
  quit(): Promise<void>;
}
