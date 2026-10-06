/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { SearchAbortController } from './search_abort_controller';
interface ResponseCacheItem {
  response$: Observable<IKibanaSearchResponse>;
  searchAbortController: SearchAbortController;
}
export declare class SearchResponseCache {
  private maxItems;
  private maxCacheSizeMB;
  private responseCache;
  private cacheSize;
  constructor(maxItems: number, maxCacheSizeMB: number);
  private byteToMb;
  private deleteItem;
  private setItem;
  clear(): void;
  private shrink;
  has(key: string): boolean;
  /**
   *
   * @param key key to cache
   * @param response$
   * @returns A ReplaySubject that mimics the behavior of the original observable
   * @throws error if key already exists
   */
  set(key: string, item: ResponseCacheItem): void;
  get(key: string): ResponseCacheItem | undefined;
}
export {};
