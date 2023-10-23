/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpResponse } from '@kbn/core/public';

const CACHE_KEY = 'data-views';
const CACHE_ENTRY_LIFETIME_MS = 1000 * 60 * 5; // 5 minutes
const DEFAULT_DESERIALIZE = <T>(response: Response) => response.json() as Promise<T>;

export interface CachedFetchOptions<T> {
  url: string;
  fetch: () => Promise<HttpResponse<T>>;
  deserialize?: (response: Response) => Promise<T>;
  forceRefresh?: boolean;
}

export class DataViewRequestCache {
  private readonly activeRequests = new Map<string, Promise<unknown>>();

  private getActiveRequest<T>(url: string) {
    const existing = this.activeRequests.get(url);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  private async openCache() {
    try {
      return await caches.open(CACHE_KEY);
    } catch (e) {
      console.error(e);
    }
  }

  async cachedFetch<T>({
    url,
    fetch,
    deserialize = DEFAULT_DESERIALIZE,
    forceRefresh,
  }: CachedFetchOptions<T>): Promise<T> {
    const cache = await this.openCache();

    let expiredResponse: Promise<T> | undefined;

    // Don't check the cache if we're forcing a refresh
    if (cache && !forceRefresh) {
      const cachedResponse = await cache.match(url);

      if (cachedResponse) {
        const responseDateString = cachedResponse?.headers.get('date');

        // If the reponse doesn't have a date header, it's invalid
        if (responseDateString) {
          const responseDate = new Date(responseDateString);
          const now = new Date();
          const diff = now.getTime() - responseDate.getTime();
          const isExpired = diff > CACHE_ENTRY_LIFETIME_MS;
          const body = deserialize(cachedResponse);

          // If the response is expired we'll still return it,
          // but first we'll make a request to update the cache
          if (isExpired) {
            expiredResponse = body;
          } else {
            return body;
          }
        }
      }
    }

    const activeRequest = this.getActiveRequest<T>(url);

    // If there's an active request for this cache key, we either return
    // the expired response if one exists to show results sooner, or we
    // wait for the active request to finish and return its response
    if (activeRequest) {
      return expiredResponse ?? activeRequest;
    }

    const returnRequest = fetch()
      .then(({ response }) => {
        // We should never get a failed response here, but just in case
        if (!response?.ok) {
          throw new Error('Received unexpected failed response');
        }

        // Clone the response so we can cache it
        const responseClone = response.clone();

        if (responseClone) {
          cache?.put(url, responseClone);
        }

        return deserialize(response);
      })
      .finally(() => {
        // Remove the request from the map since it's no longer active
        this.activeRequests.delete(url);
      });

    // Add the request to the map so we can check for it later
    this.activeRequests.set(url, returnRequest);

    // If there's an expired response, return it immediately,
    // otherwise wait for the current request to finish
    return expiredResponse ?? returnRequest;
  }
}
