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

export interface StaleWhileRevalidateCacheDependencies {
  http: HttpSetup;
  cacheName: string;
  cacheEntryLifetimeMs: number;
  getIdentityHash: () => Promise<string>;
  onOpenCacheError: (e: any) => void;
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

    // Store the expired response from the cache if one exists
    let expiredResponse: Response | undefined;

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
          const isExpired = diff > this.deps.cacheEntryLifetimeMs;

          // If the response is expired we'll still return it,
          // but first we'll make a request to update the cache
          if (isExpired) {
            expiredResponse = cachedResponse;
          } else {
            return cachedResponse;
          }
        }
      }

      const activeRequest = this.activeRequests.get(url);

      // If there's an active request for this cache key, we either return
      // the expired response if one exists to show results sooner, or we
      // wait for the active request to finish and return its response
      if (activeRequest) {
        return expiredResponse ?? activeRequest.then(cloneResponse);
      }
    }

    const currentRequest = this.deps.http
      .fetch(path, {
        ...fetchOptions,
        asResponse: true,
        rawResponse: true,
      })
      .then(({ response }) => {
        // This shouldn't happen, but just in case
        if (!response) {
          throw new Error('Response is undefined');
        }

        if (this.isActiveRequest(url, currentRequest)) {
          // Clone the response so we don't consume the original response body stream
          const clonedResponse = response.clone();

          // Clone the response headers so we can modify them
          const headers = new Headers(clonedResponse.headers);

          // Add the identity hash to the response headers so we can check it later
          headers.set(IDENTITY_HASH_HEADER, identityHash);

          // Cache the response
          cache?.put(
            url,
            new Response(clonedResponse.body, {
              headers,
              status: response.status,
              statusText: response.statusText,
            })
          );
        }

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

    // If there's an expired response, return it immediately,
    // otherwise wait for the current request to finish first
    return expiredResponse ?? currentRequest.then(cloneResponse);
  }
}

// We need to clone responses when reusing them since streams can only be read once
const cloneResponse = (response: Response) => response.clone();
