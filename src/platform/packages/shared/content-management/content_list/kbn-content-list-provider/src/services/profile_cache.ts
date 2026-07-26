/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createBatcher } from '@kbn/content-management-user-profiles';
import type { UserProfileEntry, ContentListUserProfilesServices } from './types';

type BulkResolveFn = ContentListUserProfilesServices['bulkResolve'];

/**
 * A stable, session-scoped cache for user profiles.
 *
 * Replaces the previous `useState<Map>`-based `UserProfileStore` with a plain
 * class that avoids React state identity changes on every cache update. Uses
 * `useSyncExternalStore` for reactivity: only subscribers re-render when
 * profiles are loaded.
 *
 * Key properties:
 * - **Stable reference**: created once via `useRef`, never changes identity.
 * - **`requested` set**: tracks in-flight requests so concurrent callers don't
 *   issue duplicate `bulkResolve` calls. UIDs omitted from a response are
 *   cleared so future calls can retry.
 * - **Built-in batcher**: `loadOne` batches individual requests within a 50ms
 *   window via `createBatcher`.
 * - **No React dependencies**: can be extracted to core later.
 */
export class ProfileCache {
  private cache = new Map<string, UserProfileEntry>();
  private requested = new Set<string>();
  private listeners = new Set<() => void>();
  private version = 0;
  private batcher: ReturnType<
    typeof createBatcher<UserProfileEntry[], string, UserProfileEntry | undefined>
  >;

  constructor(private readonly bulkResolve: BulkResolveFn) {
    this.batcher = createBatcher<UserProfileEntry[], string, UserProfileEntry | undefined>({
      fetcher: async (uids: string[]) => {
        const unique = [...new Set(uids)];
        const results = await this.bulkResolve(unique);
        this.merge(results);
        return results;
      },
      resolver: (profiles, uid) => profiles.find((p) => p.uid === uid),
    });
  }

  /** Synchronous lookup by UID. Returns `undefined` if not cached. */
  resolve(uid: string): UserProfileEntry | undefined {
    return this.cache.get(uid);
  }

  /** Get all cached profiles. */
  getAll(): UserProfileEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Bulk load with in-flight dedup via `requested` set.
   *
   * UIDs already in the cache or previously requested are skipped. This makes
   * concurrent calls from priming, facets, and cells safe without external
   * dedup logic.
   */
  async ensureLoaded(uids: string[]): Promise<void> {
    const missing = uids.filter((uid) => !this.cache.has(uid) && !this.requested.has(uid));
    if (missing.length === 0) {
      return;
    }

    for (const uid of missing) {
      this.requested.add(uid);
    }

    try {
      const resolved = await this.bulkResolve(missing);
      this.merge(resolved);
    } catch {
      // Swallow — profile loading is graceful degradation.
    } finally {
      // Clear `requested` for UIDs not in the cache. On success this
      // covers UIDs that bulkResolve omitted (not found) — avoids
      // permanent negative-cache entries so future calls can retry.
      // On failure it covers all requested UIDs.
      for (const uid of missing) {
        if (!this.cache.has(uid)) {
          this.requested.delete(uid);
        }
      }
    }
  }

  /**
   * Single UID load — batched via `createBatcher` (50ms window).
   *
   * Multiple cells mounting in the same frame get their `loadOne` calls
   * batched into one `bulkResolve`.
   */
  async loadOne(uid: string): Promise<UserProfileEntry | undefined> {
    if (this.cache.has(uid)) {
      return this.cache.get(uid);
    }
    if (this.requested.has(uid)) {
      return undefined;
    }
    this.requested.add(uid);
    try {
      const result = await this.batcher.fetch(uid);
      // If the UID wasn't found (resolver returned undefined), clear
      // `requested` so future calls can retry.
      if (!result && !this.cache.has(uid)) {
        this.requested.delete(uid);
      }
      return result;
    } catch {
      if (!this.cache.has(uid)) {
        this.requested.delete(uid);
      }
      return undefined;
    }
  }

  /**
   * Inject already-resolved profiles into the cache without a network call.
   *
   * Use when profiles have been fetched through an external path (e.g. a
   * custom `FilterFacetConfig.getFacets`) and should be available for
   * synchronous lookups via `resolve`/`getAll`. Does not overwrite existing
   * entries.
   */
  seed(entries: UserProfileEntry[]): void {
    this.merge(entries);
  }

  // --- useSyncExternalStore integration ---

  /** Subscribe to cache changes. Returns an unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Returns the current version (increments on every merge). */
  getSnapshot = (): number => {
    return this.version;
  };

  // --- Private ---

  /** Add entries to cache, bump version, notify subscribers. */
  private merge(entries: UserProfileEntry[]): void {
    let changed = false;
    for (const entry of entries) {
      if (!this.cache.has(entry.uid)) {
        this.cache.set(entry.uid, entry);
        changed = true;
      }
    }
    if (changed) {
      this.version += 1;
      for (const listener of this.listeners) {
        listener();
      }
    }
  }
}
