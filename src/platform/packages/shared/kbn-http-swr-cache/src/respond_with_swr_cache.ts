/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
} from '@kbn/core/server';

/** Advanced setting controlling how long (in seconds) a response is considered fresh. */
export const SWR_CACHE_MAX_AGE_SETTING = 'data_views:cache_max_age';

const DEFAULT_MAX_AGE_SECONDS = 5;
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export interface RespondWithSwrCacheOptions<TBody> {
  context: RequestHandlerContext;
  request: KibanaRequest;
  response: KibanaResponseFactory;
  body: TBody;
  /** Set to false to skip caching for this response (e.g. empty results), defaults to true. */
  cacheable?: boolean;
}

const unwrapEtag = (ifNoneMatch: string | string[] | undefined): string | undefined => {
  const value = Array.isArray(ifNoneMatch) ? ifNoneMatch[0] : ifNoneMatch;
  // Strip quotes and any encoding suffix a proxy may append (e.g. "abc-gzip")
  return value?.replace(/^"(.+)"$/, '$1').split('-')[0];
};

const getMaxAge = async (context: RequestHandlerContext): Promise<number> => {
  const { uiSettings } = await context.core;
  // The setting isn't registered on serverless, so fall back to the default
  const maxAge = await uiSettings.client.get<number | undefined>(SWR_CACHE_MAX_AGE_SETTING);
  return maxAge ?? DEFAULT_MAX_AGE_SECONDS;
};

/**
 * Responds with ETag + `stale-while-revalidate` cache headers, or 304 if the client's copy is current.
 */
export const respondWithSwrCache = async <TBody>({
  context,
  request,
  response,
  body,
  cacheable = true,
}: RespondWithSwrCacheOptions<TBody>): Promise<IKibanaResponse> => {
  const bodyAsString = JSON.stringify(body);
  const etag = createHash('sha256').update(bodyAsString).digest('hex');
  const maxAge = cacheable ? await getMaxAge(context) : 0;

  const headers = {
    'content-type': 'application/json',
    etag,
    vary: 'accept-encoding, user-hash',
    'cache-control': maxAge
      ? `private, max-age=${maxAge}, stale-while-revalidate=${ONE_YEAR_SECONDS - maxAge}`
      : 'private, no-cache',
  };

  if (unwrapEtag(request.headers['if-none-match']) === etag) {
    return response.notModified({ headers });
  }

  return response.ok({ body: bodyAsString, headers });
};
