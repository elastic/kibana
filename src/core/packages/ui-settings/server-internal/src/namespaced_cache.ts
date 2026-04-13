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
  private readonly inflightRequests = new Map<string, Promise<T>>();

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
  set(namespace: string, value: T, ttl: number): void {
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

    // Clear in-flight promise to prevent stale data
    this.inflightRequests.delete(namespace);
  }

  /**
   * Clear all cached values and in-flight promises
   */
  clear(): void {
    for (const entry of this.entries.values()) {
      clearTimeout(entry.timer);
    }
    this.entries.clear();
    this.inflightRequests.clear();
  }

  /**
   * Get in-flight promise for a specific namespace.
   * Used for request deduplication.
   */
  getInflight(namespace: string): Promise<T> | null {
    const promise = this.inflightRequests.get(namespace);
    return promise ? promise : null;
  }

  /**
   * Set in-flight promise for a specific namespace.
   * The promise is automatically removed when it resolves or rejects.
   */
  setInflight(namespace: string, promise: Promise<T>): void {
    this.inflightRequests.set(namespace, promise);

    // Auto-cleanup when promise settles
    // Only delete if this promise is still the current one (prevents race conditions)
    promise
      .then(() => {
        if (this.inflightRequests.get(namespace) === promise) {
          this.inflightRequests.delete(namespace);
        }
      })
      .catch(() => {
        if (this.inflightRequests.get(namespace) === promise) {
          this.inflightRequests.delete(namespace);
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
