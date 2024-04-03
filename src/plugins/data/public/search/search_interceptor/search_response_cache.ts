/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, Subscription } from 'rxjs';
import { SearchAbortController } from './search_abort_controller';
import { IKibanaSearchResponse } from '../../../common';

interface ResponseCacheItem {
  response$: Observable<IKibanaSearchResponse>;
  searchAbortController: SearchAbortController;
}

interface ResponseCacheItemInternal {
  response$: Observable<IKibanaSearchResponse>;
  searchAbortController: SearchAbortController;
  size: number;
  subs: Subscription;
}

export class SearchResponseCache {
  private responseCache: Map<string, ResponseCacheItemInternal>;
  private cacheSize = 0;

  constructor(private maxItems: number, private maxCacheSizeMB: number) {
    this.responseCache = new Map();
  }

  private byteToMb(size: number) {
    return size / (1024 * 1024);
  }

  private deleteItem(key: string, clearSubs = true) {
    const item = this.responseCache.get(key);
    if (item) {
      if (clearSubs) {
        item.subs.unsubscribe();
      }
      this.cacheSize -= item.size;
      this.responseCache.delete(key);
    }
  }

  private setItem(key: string, item: ResponseCacheItemInternal) {
    // The deletion of the key will move it to the end of the Map's entries.
    this.deleteItem(key, false);
    this.cacheSize += item.size;
    this.responseCache.set(key, item);
  }

  public clear() {
    this.cacheSize = 0;
    this.responseCache.forEach((item) => {
      item.subs.unsubscribe();
    });
    this.responseCache.clear();
  }

  private shrink() {
    while (
      this.responseCache.size > this.maxItems ||
      this.byteToMb(this.cacheSize) > this.maxCacheSizeMB
    ) {
      const [key] = [...this.responseCache.keys()];
      this.deleteItem(key);
    }
  }

  public has(key: string) {
    return this.responseCache.has(key);
  }

  /**
   *
   * @param key key to cache
   * @param response$
   * @returns A ReplaySubject that mimics the behavior of the original observable
   * @throws error if key already exists
   */
  public set(key: string, item: ResponseCacheItem) {
    if (this.responseCache.has(key)) {
      throw new Error('duplicate key');
    }

    const { response$, searchAbortController } = item;

    const cacheItem: ResponseCacheItemInternal = {
      response$,
      searchAbortController,
      subs: new Subscription(),
      size: 0,
    };

    this.setItem(key, cacheItem);

    cacheItem.subs.add(
      response$.subscribe({
        next: (r) => {
          // TODO: avoid stringiying. Get the size some other way!
          const newSize = new Blob([JSON.stringify(r)]).size;
          if (this.byteToMb(newSize) < this.maxCacheSizeMB) {
            this.setItem(key, {
              ...cacheItem,
              size: newSize,
            });
            this.shrink();
          } else {
            // Single item is too large to be cached
            // Evict and ignore.
            this.deleteItem(key);
          }
        },
        error: (e) => {
          // Evict item on error
          this.deleteItem(key);
        },
      })
    );
    this.shrink();
  }

  public get(key: string): ResponseCacheItem | undefined {
    const item = this.responseCache.get(key);
    if (item) {
      // touch the item, and move it to the end of the map's entries
      this.setItem(key, item);
      return {
        response$: item.response$,
        searchAbortController: item.searchAbortController,
      };
    }
  }
}
