/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs';
import crypto from 'node:crypto';
import type { BaseValidationFileResult } from './base_validation';

export interface CacheEntry {
  hash: string;
  result: BaseValidationFileResult;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  enabled: boolean;
  maxEntries: number;
  maxAge: number;
  maxMemoryUsage: number;
  evictionPolicy: 'lru' | 'lfu' | 'timestamp';
}

export interface CacheStats {
  entries: number;
  memoryUsage: number;
  hitRate: number;
  oldestEntry: number;
  hits: number;
  misses: number;
  evictions: number;
  averageAccessTime: number;
}

/**
 * Manages caching of OAS validation results to improve performance across multiple validation runs.
 *
 * Caching unchanged file validation.
 * Supports multiple eviction policies, memory management, and stats tracking.
 *
 * @example
 * ```typescript
 * import { ValidationCache } from './validation_cache';
 *
 * const cache = new ValidationCache({
 *   enabled: true,
 *   maxEntries: 500,
 *   maxAge: 60 * 60 * 1000, // 1 hour
 *   maxMemoryUsage: 100 * 1024 * 1024, // 100MB
 *   evictionPolicy: 'lru'
 * });
 *
 * // Check cache before validation
 * const cachedResult = cache.get('./spec.yaml');
 * if (cachedResult) {
 *   log.info('Using cached validation result');
 *   return cachedResult;
 * }
 *
 * // Perform validation and cache result
 * const validationResult = await performValidation('./spec.yaml');
 * cache.set('./spec.yaml', validationResult);
 *
 * // Monitor cache performance
 * const stats = cache.getStats();
 * log.info(`Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
 * ```
 *
 * @public
 */
export class ValidationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private options: CacheOptions;
  private currentMemoryUsage: number = 0;
  private accessOrder: string[] = [];
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalAccessTime: 0,
    accessCount: 0,
  };

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      enabled: true,
      maxEntries: 1000,
      maxAge: 30 * 60 * 1000,
      maxMemoryUsage: 50 * 1024 * 1024,
      evictionPolicy: 'lru',
      ...options,
    };
  }

  get(filePath: string): BaseValidationFileResult | null {
    if (!this.options.enabled) {
      this.stats.misses++;
      return null;
    }

    const startTime = Date.now();

    const entry = this.cache.get(filePath);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > this.options.maxAge) {
      this.cache.delete(filePath);
      this.currentMemoryUsage -= entry.size;
      this.removeFromAccessOrder(filePath);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    const currentHash = this.calculateFileHash(filePath);
    if (currentHash !== entry.hash) {
      this.cache.delete(filePath);
      this.currentMemoryUsage -= entry.size;
      this.removeFromAccessOrder(filePath);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(filePath);

    this.stats.hits++;
    this.stats.totalAccessTime += Date.now() - startTime;
    this.stats.accessCount++;

    return entry.result;
  }

  set(filePath: string, result: BaseValidationFileResult): void {
    if (!this.options.enabled) {
      return;
    }

    const hash = this.calculateFileHash(filePath);
    const size = this.estimateEntrySize(result);

    if (this.currentMemoryUsage + size > this.options.maxMemoryUsage) {
      this.evictOldEntries(size);
    }

    if (this.cache.size >= this.options.maxEntries) {
      this.evictOldEntries(0);
    }

    const now = Date.now();
    const entry: CacheEntry = {
      hash,
      result,
      timestamp: now,
      size,
      accessCount: 1,
      lastAccessed: now,
    };

    const oldEntry = this.cache.get(filePath);
    if (oldEntry) {
      this.currentMemoryUsage -= oldEntry.size;
      this.removeFromAccessOrder(filePath);
    }

    this.cache.set(filePath, entry);
    this.currentMemoryUsage += size;
    this.updateAccessOrder(filePath);
  }

  clear(): void {
    this.cache.clear();
    this.currentMemoryUsage = 0;
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalAccessTime: 0,
      accessCount: 0,
    };
  }

  getStats(): CacheStats {
    const entries = this.cache.size;
    const memoryUsage = this.currentMemoryUsage;

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    let oldestEntry = Date.now();
    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
    }

    const averageAccessTime =
      this.stats.accessCount > 0 ? this.stats.totalAccessTime / this.stats.accessCount : 0;

    return {
      entries,
      memoryUsage,
      hitRate,
      oldestEntry: entries > 0 ? oldestEntry : 0,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      averageAccessTime,
    };
  }

  isEnabled(): boolean {
    return this.options.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  private calculateFileHash(filePath: string): string {
    try {
      if (!Fs.existsSync(filePath)) {
        return '';
      }

      const stats = Fs.statSync(filePath);
      const content = Fs.readFileSync(filePath);

      const hasher = crypto.createHash('sha256');
      hasher.update(content);
      hasher.update(stats.mtime.toISOString());

      return hasher.digest('hex');
    } catch {
      return '';
    }
  }

  private estimateEntrySize(result: BaseValidationFileResult): number {
    const baseSize = 200;
    const pathSize = result.filePath.length * 2;
    const errorSize = result.errors.reduce((total, error) => {
      return total + error.instancePath.length * 2 + error.message.length * 2 + 50;
    }, 0);

    return baseSize + pathSize + errorSize;
  }

  private evictOldEntries(neededSpace: number): void {
    let sortedEntries: Array<[string, CacheEntry]>;

    switch (this.options.evictionPolicy) {
      case 'lru':
        sortedEntries = this.accessOrder
          .map((key) => [key, this.cache.get(key)!])
          .filter(([, entry]) => entry) as Array<[string, CacheEntry]>;
        break;
      case 'lfu':
        sortedEntries = Array.from(this.cache.entries()).sort(
          ([, a], [, b]) => a.accessCount - b.accessCount
        );
        break;
      case 'timestamp':
      default:
        sortedEntries = Array.from(this.cache.entries()).sort(
          ([, a], [, b]) => a.timestamp - b.timestamp
        );
        break;
    }

    let freedSpace = 0;
    const entriesToRemove: string[] = [];

    for (const [filePath, entry] of sortedEntries) {
      entriesToRemove.push(filePath);
      freedSpace += entry.size;

      if (freedSpace >= neededSpace + this.options.maxMemoryUsage * 0.1) {
        break;
      }

      if (this.cache.size >= this.options.maxEntries) {
        break;
      }
    }

    for (const filePath of entriesToRemove) {
      const entry = this.cache.get(filePath);
      if (entry) {
        this.currentMemoryUsage -= entry.size;
        this.cache.delete(filePath);
        this.removeFromAccessOrder(filePath);
        this.stats.evictions++;
      }
    }
  }

  private updateAccessOrder(filePath: string): void {
    this.removeFromAccessOrder(filePath);
    this.accessOrder.push(filePath);
  }

  private removeFromAccessOrder(filePath: string): void {
    const index = this.accessOrder.indexOf(filePath);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  async processFiles(
    filePaths: string[],
    processor: (filePath: string) => Promise<BaseValidationFileResult>
  ): Promise<BaseValidationFileResult[]> {
    const results: Array<{ filePath: string; result: BaseValidationFileResult }> = [];
    const uncachedFiles: string[] = [];

    for (const filePath of filePaths) {
      const cachedResult = this.get(filePath);
      if (cachedResult) {
        results.push({ filePath, result: cachedResult });
      } else {
        uncachedFiles.push(filePath);
      }
    }

    if (uncachedFiles.length > 0) {
      const processingPromises = uncachedFiles.map(async (filePath) => {
        const result = await processor(filePath);
        this.set(filePath, result);
        return { filePath, result };
      });

      const newResults = await Promise.all(processingPromises);
      results.push(...newResults);
    }

    return filePaths.map((filePath) => {
      const result = results.find((r) => r.filePath === filePath);
      return result!.result;
    });
  }

  async warmCache(
    filePaths: string[],
    processor: (filePath: string) => Promise<BaseValidationFileResult>
  ): Promise<void> {
    const uncachedFiles = filePaths.filter((filePath) => !this.cache.has(filePath));

    if (uncachedFiles.length > 0) {
      const batchSize = Math.min(10, uncachedFiles.length);
      for (let i = 0; i < uncachedFiles.length; i += batchSize) {
        const batch = uncachedFiles.slice(i, i + batchSize);
        const batchPromises = batch.map(async (filePath) => {
          try {
            const result = await processor(filePath);
            this.set(filePath, result);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(`Failed to warm cache for ${filePath}:`, error);
          }
        });

        await Promise.all(batchPromises);
      }
    }
  }
}

export const validationCache = new ValidationCache({
  enabled: true,
  maxEntries: 2000,
  maxAge: 60 * 60 * 1000,
  maxMemoryUsage: 100 * 1024 * 1024,
  evictionPolicy: 'lru',
});

export const createPerformanceCache = (options: Partial<CacheOptions> = {}): ValidationCache => {
  return new ValidationCache({
    enabled: true,
    maxEntries: 5000,
    maxAge: 2 * 60 * 60 * 1000,
    maxMemoryUsage: 200 * 1024 * 1024,
    evictionPolicy: 'lru',
    ...options,
  });
};
