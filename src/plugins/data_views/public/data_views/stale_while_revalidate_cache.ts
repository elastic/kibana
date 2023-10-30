/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpFetchOptions, HttpSetup } from '@kbn/core-http-browser';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { format } from 'url';

const IDENTITY_HASH_HEADER = 'x-swr-identity-hash';
const DATE_HEADER = 'date';
const CONTENT_LENGTH_HEADER = 'content-length';

export interface StaleWhileRevalidateCacheDependencies {
  http: HttpSetup;
  cacheName: string;
  cacheEntryFreshTimeMs: number;
  cacheEntryMaxAgeMs: number;
  cachePruneIntervalMs: number;
  cacheMaxSizeBytes: number;
  getIdentityHash: () => Promise<string>;
  onOpenCacheError: (e: any) => void;
  onPruneError: (e: any) => void;
}

export type CachedHttpFetchOptions = Pick<HttpFetchOptions, 'query' | 'version'> & {
  forceRefresh?: boolean;
};

export class StaleWhileRevalidateCache {
  private readonly activeRequests = new Map<string, Promise<Response>>();

  constructor(private readonly deps: StaleWhileRevalidateCacheDependencies) {}

  private async openCache() {
    try {
      return await caches?.open(this.deps.cacheName);
    } catch (e) {
      this.deps.onOpenCacheError(e);
    }
  }

  private isActiveRequest(url: string, request: Promise<Response>) {
    return this.activeRequests.get(url) === request;
  }

  async fetch(
    path: string,
    { forceRefresh, ...fetchOptions }: CachedHttpFetchOptions
  ): Promise<Response> {
    const cache = await this.openCache();
    const identityHash = await this.deps.getIdentityHash();
    const url = format({
      pathname: this.deps.http.basePath.prepend(path),
      ...fetchOptions,
    });

    // Store the stale response from the cache if one exists
    let staleResponse: Response | undefined;

    // Don't check the cache or active requests if we're forcing a refresh
    if (!forceRefresh) {
      const cachedResponse = await cache?.match(url);

      if (cachedResponse) {
        const identityHashHeader = cachedResponse.headers.get(IDENTITY_HASH_HEADER) ?? '';
        const version = fetchOptions.version ?? '';
        const versionHeader = cachedResponse.headers.get(ELASTIC_HTTP_VERSION_HEADER) ?? '';
        const dateHeader = cachedResponse.headers.get(DATE_HEADER);

        // If the identity hash or version doesn't match, or the
        // response doesn't have a date header, then it's invalid
        if (identityHash === identityHashHeader && version === versionHeader && dateHeader) {
          const date = new Date(dateHeader);
          const now = new Date();
          const diff = now.getTime() - date.getTime();
          const isStale = diff > this.deps.cacheEntryFreshTimeMs;

          // If the response is stale we'll still return it,
          // but first we'll make a request to update the cache
          if (isStale) {
            staleResponse = cachedResponse;
          } else {
            return cachedResponse;
          }
        }
      }

      const activeRequest = this.activeRequests.get(url);

      // If there's an active request for this cache key, we either return
      // the stale response if one exists to show results sooner, or we
      // wait for the active request to finish and return its response
      if (activeRequest) {
        return staleResponse ?? activeRequest.then(cloneResponse);
      }
    }

    const currentRequest = this.deps.http
      .fetch(path, {
        ...fetchOptions,
        asResponse: true,
        rawResponse: true,
      })
      .then(async ({ response }) => {
        debugger;
        // This shouldn't happen, but just in case
        if (!response) {
          throw new Error('Response is undefined');
        }

        // If the response doesn't have a body or is no longer active, don't cache it
        if (!response.body || !this.isActiveRequest(url, currentRequest)) {
          return response;
        }

        // Create request headers to store some metadata about the response
        const headers = new Headers();
        const cachedRequest = new Request(url, { headers });

        // Add the identity hash to the response headers so we can check it later
        headers.set(IDENTITY_HASH_HEADER, identityHash);

        // Add the content length to the response headers so we can check it later
        headers.set(CONTENT_LENGTH_HEADER, await getContentLength(response.clone()));

        // Clone the response so we can cache it and still read the original response body
        const clonedResponse = response.clone();
        const cachedResponse = new Response(clonedResponse.body, { ...clonedResponse, headers });

        // Cache the response
        cache?.put(cachedRequest, cachedResponse);

        return response;
      })
      .finally(() => {
        if (this.isActiveRequest(url, currentRequest)) {
          // Remove the request from the map since it's no longer active
          this.activeRequests.delete(url);
        }
      });

    // Add the request to the map so we can check for it later
    this.activeRequests.set(url, currentRequest);

    // If there's a stale response, return it immediately,
    // otherwise wait for the current request to finish first
    return staleResponse ?? currentRequest.then(cloneResponse);
  }

  // Starts pruning immediately and then sets up a timer to execute a prune periodically,
  // waiting for the previous prune to finish before starting a new one.
  startPruning() {
    debugger;
    let pruneTimeout: ReturnType<typeof setTimeout>;

    const prune = async () => {
      clearTimeout(pruneTimeout);

      try {
        await this.prune();
      } catch (e) {
        this.deps.onPruneError(e);
      }

      pruneTimeout = setTimeout(prune, this.deps.cachePruneIntervalMs);
    };

    prune();

    return () => clearTimeout(pruneTimeout);
  }

  // prune deletes expired cache entries and ensures the cache size is below the max size.
  // This should be called periodically to ensure the cache doesn't grow too large.
  // It sorts the cache entries by date asc and deletes the expired entries,
  // then delete the oldest entries until the cache size is below the max size.
  private async prune() {
    const cache = await this.openCache();

    if (!cache) {
      return;
    }

    const cacheEntries = [...(await cache.keys())];

    // Sort the cache entries by date
    cacheEntries.sort((a, b) => {
      const aDate = new Date(a.headers.get(DATE_HEADER) ?? '');
      const bDate = new Date(b.headers.get(DATE_HEADER) ?? '');

      return aDate.getTime() - bDate.getTime();
    });

    // Delete expired cache entries and get the content length of the valid entries
    let contentLength = 0;

    await Promise.all(
      cacheEntries.map(async (cacheEntry) => {
        const date = new Date(cacheEntry.headers.get(DATE_HEADER) ?? '');
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const isExpired = diff > this.deps.cacheEntryMaxAgeMs;

        if (isExpired) {
          await cache.delete(cacheEntry);
          cacheEntries.splice(cacheEntries.indexOf(cacheEntry), 1);
        } else {
          contentLength += parseInt(cacheEntry.headers.get(CONTENT_LENGTH_HEADER) ?? '', 10);
        }
      })
    );

    // Delete cache entries until the cache size is below the max size
    if (contentLength > this.deps.cacheMaxSizeBytes) {
      await Promise.all(
        cacheEntries.map((cacheEntry) => {
          contentLength -= parseInt(cacheEntry.headers.get(CONTENT_LENGTH_HEADER) ?? '', 10);

          if (contentLength > this.deps.cacheMaxSizeBytes) {
            return cache.delete(cacheEntry);
          }
        })
      );
    }
  }
}

// We need to clone responses when reusing them since streams can only be read once
const cloneResponse = (response: Response) => response.clone();

// Calculate the content length of a response by reading the entire body
const getContentLength = async (response: Response) => {
  if (!response.body) {
    return '0';
  }

  const reader = response.body.getReader();
  let contentLength = 0;
  let chunk = await reader.read();

  while (!chunk.done) {
    contentLength += chunk.value.length;
    chunk = await reader.read();
  }

  return contentLength.toString();
};
