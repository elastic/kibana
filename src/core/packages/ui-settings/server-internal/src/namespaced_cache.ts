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
 * Entries that omit a scope share this one. Production readers pass the
 * caller's credential scope so different principals never collide.
 */
const DEFAULT_CACHE_SCOPE = '';
const CACHE_KEY_SEPARATOR = '\0';

function storageKey(namespace: string, scope: string): string {
  return `${namespace}${CACHE_KEY_SEPARATOR}${scope}`;
}

/**
 * Shared process-wide cache for namespace-and-scope-keyed data with configurable TTL.
 * Used to cache getUserProvided() results across IUiSettingsClient instances that
 * authenticate as the same principal.
 *
 * Includes in-flight request deduplication to prevent a thundering herd of
 * concurrent reads for one namespace and one credential. A settings write
 * drops every scope in the namespace.
 *
 * @internal
 */
export class NamespacedCache<T = unknown> {
  private readonly entries = new Map<string, NamespacedCacheEntry<T>>();
  private readonly inflightReads = new Map<string, Promise<T>>();

  /**
   * Get cached value for a namespace and credential scope.
   */
  get(namespace: string, scope: string = DEFAULT_CACHE_SCOPE): T | null {
    const entry = this.entries.get(storageKey(namespace, scope));
    return entry ? entry.value : null;
  }

  /**
   * Set cached value with TTL for a namespace and credential scope.
   * Replaces only that scope. Other principals in the namespace are left alone.
   */
  set(
    namespace: string,
    value: T,
    ttl: number = NAMESPACED_CACHE_TTL,
    scope: string = DEFAULT_CACHE_SCOPE
  ): void {
    const key = storageKey(namespace, scope);
    this.clearEntry(key);
    this.inflightReads.delete(key);

    const timer = setTimeout(() => {
      this.entries.delete(key);
    }, ttl);

    this.entries.set(key, { value, timer });
  }

  /**
   * Delete every cached value and in-flight read in a namespace, for every scope.
   * A settings write must not leave another principal holding the pre-write value.
   */
  del(namespace: string): void {
    const prefix = storageKey(namespace, '');
    [...this.entries.keys()]
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => this.clearEntry(key));
    [...this.inflightReads.keys()]
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => this.inflightReads.delete(key));
  }

  private clearEntry(key: string): void {
    const entry = this.entries.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      this.entries.delete(key);
    }
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
  getInflightRead(namespace: string, scope: string = DEFAULT_CACHE_SCOPE): Promise<T> | null {
    const promise = this.inflightReads.get(storageKey(namespace, scope));
    return promise ? promise : null;
  }

  /**
   * Set in-flight promise for a namespace and credential scope.
   * The promise is automatically removed when it resolves or rejects.
   */
  setInflightRead(
    namespace: string,
    promise: Promise<T>,
    scope: string = DEFAULT_CACHE_SCOPE
  ): void {
    const key = storageKey(namespace, scope);
    this.inflightReads.set(key, promise);

    // Auto-cleanup when promise settles.
    // Only delete if this promise is still the current one (prevents race conditions).
    const clearIfCurrent = () => {
      if (this.inflightReads.get(key) === promise) {
        this.inflightReads.delete(key);
      }
    };
    promise.then(clearIfCurrent, clearIfCurrent);
  }

  /**
   * Check if a namespace and scope have a cached value
   */
  has(namespace: string, scope: string = DEFAULT_CACHE_SCOPE): boolean {
    return this.entries.has(storageKey(namespace, scope));
  }
}
