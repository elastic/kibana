/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Cache entry for a namespace
 * @internal
 */
interface NamespacedCacheEntry<T = unknown> {
  value: T;
  timer: NodeJS.Timeout;
}

export const NAMESPACED_CACHE_TTL = 10_000;

/**
 * Shared process-wide cache for namespace-keyed data with configurable TTL.
 * Used to cache getUserProvided() results across IUiSettingsClient instances.
 *
 * Includes in-flight request deduplication to prevent thundering herd when
 * multiple concurrent requests fetch the same namespace's data.
 *
 * @internal
 */
export class NamespacedCache<T = unknown> {
  private readonly entries = new Map<string, NamespacedCacheEntry<T>>();
  private readonly inflightReads = new Map<string, Promise<T>>();

  /**
   * Get cached value for a specific namespace
   */
  get(namespace: string): T | null {
    const entry = this.entries.get(namespace);
    return entry ? entry.value : null;
  }

  /**
   * Set cached value with TTL
   */
  set(namespace: string, value: T, ttl: number = NAMESPACED_CACHE_TTL): void {
    this.del(namespace); // Clear existing timer

    const timer = setTimeout(() => {
      this.entries.delete(namespace);
    }, ttl);

    this.entries.set(namespace, { value, timer });
  }

  /**
   * Delete cached value and clear any in-flight promises.
   * This ensures cache invalidation also prevents stale in-flight requests.
   */
  del(namespace: string): void {
    // Clear cached value
    const entry = this.entries.get(namespace);
    if (entry) {
      clearTimeout(entry.timer);
      this.entries.delete(namespace);
    }

    // Clear in-flight promises to prevent stale data
    this.inflightReads.delete(namespace);
  }

  /**
   * Clear all cached values and in-flight promises
   */
  clear(): void {
    for (const entry of this.entries.values()) {
      clearTimeout(entry.timer);
    }
    this.entries.clear();
    this.inflightReads.clear();
  }

  /**
   * Get in-flight read promise for a specific namespace.
   * Used for request deduplication - caller receives the actual result.
   */
  getInflightRead(namespace: string): Promise<T> | null {
    const promise = this.inflightReads.get(namespace);
    return promise ? promise : null;
  }

  /**
   * Set in-flight promise for a specific namespace.
   * The promise is automatically removed when it resolves or rejects.
   */
  setInflightRead(namespace: string, promise: Promise<T>): void {
    this.inflightReads.set(namespace, promise);

    // Auto-cleanup when promise settles
    // Only delete if this promise is still the current one (prevents race conditions)
    promise
      .then(() => {
        if (this.inflightReads.get(namespace) === promise) {
          this.inflightReads.delete(namespace);
        }
      })
      .catch(() => {
        if (this.inflightReads.get(namespace) === promise) {
          this.inflightReads.delete(namespace);
        }
      });
  }

  /**
   * Check if a namespace has a cached value
   */
  has(namespace: string): boolean {
    return this.entries.has(namespace);
  }
}
