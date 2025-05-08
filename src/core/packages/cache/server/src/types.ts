/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface CacheStorage {
  /**
   * Retrieves a value from the cache by its key.
   * @param key - The key of the cached item.
   * @returns A promise resolving to the cached value or undefined if not found.
   */
  get(key: string): Promise<string | undefined>;

  /**
   * Stores a value in the cache with a specified key.
   * @param key - The key to associate with the cached item.
   * @param value - The value to cache.
   * @param ttl - Optional time-to-live in milliseconds.
   * @returns A promise that resolves when the value is stored.
   */
  set(key: string, value: string, ttl?: number): Promise<void>;

  /**
   * Removes a value from the cache by its key.
   * @param key - The key of the cached item to remove.
   * @returns A promise that resolves when the value is removed.
   */
  delete(key: string): Promise<void>;

  /**
   * Clears all items from the cache.
   * @returns A promise that resolves when the cache is cleared.
   */
  clear(): Promise<void>;

  /**
   * Checks if a key exists in the cache.
   * @param key - The key to check.
   * @returns A promise resolving to true if the key exists, false otherwise.
   */
  has(key: string): Promise<boolean>;
}

export interface CacheSetupContract {
  store?: CacheStorage;
}

export type CacheStartContract = CacheSetupContract;
