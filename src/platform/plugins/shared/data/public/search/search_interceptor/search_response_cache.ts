/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { SearchAbortController } from './search_abort_controller';

interface ResponseCacheItem {
  groupId: string;
  response$: Observable<IKibanaSearchResponse>;
  searchAbortController: SearchAbortController;
}

interface ResponseCacheItemInternal {
  groupId: string;
  response$: Observable<IKibanaSearchResponse>;
  searchAbortController: SearchAbortController;
  size: number;
  subs: Subscription;
  hasCompletedResponse: boolean;
}

/** Stores replayable search responses with eviction by group. */
export class SearchResponseCache {
  private responseCache: Map<string, ResponseCacheItemInternal>;
  private cacheSize = 0;

  constructor(private maxCacheSizeMB: number) {
    this.responseCache = new Map();
  }

  // --- Response cache operations ---

  private byteToMb(size: number) {
    return size / (1024 * 1024);
  }

  private deleteItem(key: string) {
    const item = this.responseCache.get(key);
    if (item) {
      item.subs.unsubscribe();
      this.cacheSize -= item.size;
      this.responseCache.delete(key);
    }
  }

  /** Releases all cache subscriptions and resets size accounting without aborting active consumers. */
  public clear() {
    this.cacheSize = 0;
    this.responseCache.forEach((item) => {
      item.subs.unsubscribe();
    });
    this.responseCache.clear();
  }

  private shrink() {
    while (this.byteToMb(this.cacheSize) > this.maxCacheSizeMB) {
      const oldestItem = this.responseCache.values().next().value;
      if (!oldestItem) return;
      this.evictGroup(oldestItem.groupId);
    }
  }

  /** Checks key presence, including in-flight searches, without updating eviction priority. */
  public has(key: string) {
    return this.responseCache.has(key);
  }

  /**
   * Tracks response size and replay readiness while enforcing cache limits.
   *
   * @param key key to cache
   * @param item shared search observable, abort controller, and group identifier
   * @throws error if key already exists
   */
  public set(key: string, item: ResponseCacheItem) {
    if (this.responseCache.has(key)) {
      throw new Error('duplicate key');
    }

    const { groupId, response$, searchAbortController } = item;

    const cacheItem: ResponseCacheItemInternal = {
      groupId,
      response$,
      searchAbortController,
      subs: new Subscription(),
      size: 0,
      hasCompletedResponse: false,
    };

    this.responseCache.set(key, cacheItem);
    this.touchGroup(groupId);

    cacheItem.subs.add(
      response$.subscribe({
        next: (response) => {
          if (this.responseCache.get(key) !== cacheItem) return;

          const { isRunning } = response;
          const newSize = new Blob([JSON.stringify(response)]).size;
          if (this.byteToMb(newSize) < this.maxCacheSizeMB) {
            this.cacheSize += newSize - cacheItem.size;
            cacheItem.size = newSize;
            // A finished response may still be partial, for example when some shards fail.
            // Such responses are cached; responses from aborted searches are excluded.
            cacheItem.hasCompletedResponse =
              !isRunning && !searchAbortController.getSignal().aborted;
            this.touchGroup(groupId);
            this.shrink();
          } else {
            // Single item is too large to be cached
            // Evict and ignore.
            this.deleteItem(key);
          }
        },
        error: () => {
          if (this.responseCache.get(key) === cacheItem) {
            this.deleteItem(key);
          }
        },
        complete: () => {
          if (this.responseCache.get(key) === cacheItem && !cacheItem.hasCompletedResponse) {
            this.deleteItem(key);
          }
        },
      })
    );
    this.shrink();
  }

  /** Returns a shared search, including one still in flight, and marks its entire group as recently used. */
  public get(key: string): ResponseCacheItem | undefined {
    const item = this.responseCache.get(key);
    if (item) {
      this.touchGroup(item.groupId);
      return {
        groupId: item.groupId,
        response$: item.response$,
        searchAbortController: item.searchAbortController,
      };
    }
  }

  // --- Group operations ---

  /** Reports replay availability when at least one response is complete, even if other requests are missing. */
  public hasCompletedResponses(groupId: string): boolean {
    for (const item of this.responseCache.values()) {
      if (item.groupId === groupId && item.hasCompletedResponse) {
        return true;
      }
    }

    return false;
  }

  /** Releases every cached entry in a group while allowing searches with other subscribers to continue. */
  public evictGroup(groupId: string): void {
    for (const [key, item] of this.responseCache) {
      if (item.groupId === groupId) {
        this.deleteItem(key);
      }
    }
  }

  private touchGroup(groupId: string) {
    for (const [key, item] of [...this.responseCache]) {
      if (item.groupId === groupId) {
        // The deletion of the key will move it to the end of the Map's entries.
        this.responseCache.delete(key);
        this.responseCache.set(key, item);
      }
    }
  }
}
