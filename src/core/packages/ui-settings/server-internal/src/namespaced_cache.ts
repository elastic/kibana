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
  private readonly inflightReads = new Map<string, Promise<T>>();
  private readonly inflightWrites = new Map<string, Promise<void>>();

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

    // Clear in-flight promises to prevent stale data
    this.inflightReads.delete(namespace);
    this.inflightWrites.delete(namespace);
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
    this.inflightWrites.clear();
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
   * Wait for any in-flight read to complete, ignoring errors.
   * Used for synchronization when writes need to wait for reads.
   */
  async awaitInflightRead(namespace: string): Promise<void> {
    const promise = this.inflightReads.get(namespace);
    if (promise) {
      await promise.catch(() => {
        // Ignore errors - caller just needs to wait for completion
      });
    }
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

  /**
   * Wait for any in-flight write to complete.
   * Errors are already swallowed in setInflightWrite, so this is safe to await.
   * Used for synchronization when reads need to wait for writes.
   */
  async awaitInflightWrite(namespace: string): Promise<void> {
    const promise = this.inflightWrites.get(namespace);
    if (promise) {
      await promise;
    }
  }

  /**
   * Set in-flight write promise for a specific namespace.
   * The promise is automatically removed when it resolves or rejects.
   * Errors are swallowed since reads will continue from ES regardless of write success.
   */
  setInflightWrite(namespace: string, promise: Promise<void>): void {
    // Wrap promise to swallow errors - callers don't need to handle them
    const safePromise = promise.catch(() => {
      // Error swallowed - reads waiting on this write will continue from ES anyway
    });

    // Auto-cleanup when promise settles
    // Only delete if this promise is still the current one (prevents race conditions)
    safePromise.finally(() => {
      if (this.inflightWrites.get(namespace) === safePromise) {
        this.inflightWrites.delete(namespace);
      }
    });

    this.inflightWrites.set(namespace, safePromise);
  }
}
