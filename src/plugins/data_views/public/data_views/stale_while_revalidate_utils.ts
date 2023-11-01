/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export const IDENTITY_HASH_HEADER = 'x-swr-identity-hash';
export const CONTENT_LENGTH_HEADER = 'x-swr-content-length';
export const REQUEST_DATE_HEADER = 'x-swr-date';
export const RESPONSE_DATE_HEADER = 'date';

// We need to clone responses when reusing them since streams can only be read once
export const cloneResponse = (response: Response) => response.clone();

export const isOlderThanMs = (date: ConstructorParameters<typeof Date>[0], ms: number) => {
  const parsedDate = new Date(date);
  const now = new Date();
  const diff = now.getTime() - parsedDate.getTime();

  return diff > ms;
};

export const resolveCachedResponse = async ({
  cache,
  url,
  identityHash,
  version,
  cacheEntryFreshTimeMs,
}: {
  cache: Cache | undefined;
  url: string;
  identityHash: string;
  version: string;
  cacheEntryFreshTimeMs: number;
}) => {
  const cachedResponse = await cache?.match(url);

  if (!cachedResponse) {
    return {
      cachedResponse: undefined,
    };
  }

  const identityHashHeader = cachedResponse.headers.get(IDENTITY_HASH_HEADER) ?? '';
  const versionHeader = cachedResponse.headers.get(ELASTIC_HTTP_VERSION_HEADER) ?? '';
  const dateHeader = cachedResponse.headers.get(RESPONSE_DATE_HEADER);

  if (identityHash !== identityHashHeader || version !== versionHeader || !dateHeader) {
    return {
      cachedResponse: undefined,
    };
  }

  return {
    cachedResponse,
    isStale: isOlderThanMs(dateHeader, cacheEntryFreshTimeMs),
  };
};

export const createCachedResponse = (response: Response, newHeaders: Record<string, string>) => {
  // Clone the response so we can cache it and still read the original response body
  const clonedResponse = response.clone();
  const clonedHeaders = Array.from(clonedResponse.headers).reduce(
    (acc, [key, value]) => ({ ...acc, [key]: value }),
    {}
  );

  return new Response(clonedResponse.body, {
    ...clonedResponse,
    headers: { ...clonedHeaders, ...newHeaders },
  });
};

export const createCachedRequest = (
  url: string,
  response: Response,
  newHeaders: Record<string, string>
) => {
  const dateHeader = response.headers.get(RESPONSE_DATE_HEADER);
  const headers = dateHeader ? { ...newHeaders, [REQUEST_DATE_HEADER]: dateHeader } : newHeaders;

  return new Request(url, { headers });
};

export const getContentLength = async (response: Response) => {
  // Clone the response so we can still read the original response body
  const clonedResponse = response.clone();

  if (!clonedResponse.body) {
    return '0';
  }

  const reader = clonedResponse.body.getReader();

  let contentLength = 0;
  let chunk = await reader.read();

  while (!chunk.done) {
    contentLength += chunk.value.length;
    chunk = await reader.read();
  }

  return contentLength.toString();
};

export const parseRequestDate = (headers: Headers) =>
  new Date(headers.get(REQUEST_DATE_HEADER) ?? Date.now());

export const parseContentLength = (headers: Headers) =>
  parseInt(headers.get(CONTENT_LENGTH_HEADER) ?? '0', 10);
