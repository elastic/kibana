/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildPath, isHttpFetchError } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../common/constants';
import type {
  DiscoverSessionApiDataInput,
  DiscoverSessionApiResponse,
  DiscoverSessionGetResponse,
} from '../../server';

export interface DiscoverSessionClient {
  create: (data: DiscoverSessionApiDataInput) => Promise<DiscoverSessionApiResponse>;
  get: (id: string) => Promise<DiscoverSessionGetResponse>;
  upsert: (id: string, data: DiscoverSessionApiDataInput) => Promise<DiscoverSessionApiResponse>;
}

/** Creates the browser client used by Discover's core session flows. */
export const createDiscoverSessionClient = (http: HttpStart): DiscoverSessionClient => ({
  create: (data) =>
    requestWithReadableError(() =>
      http.post<DiscoverSessionApiResponse>(DISCOVER_SESSION_API_BASE_PATH, {
        version: DISCOVER_SESSION_API_VERSION,
        body: JSON.stringify(data),
      })
    ),

  get: (id) =>
    requestWithReadableError(
      () =>
        http.get<DiscoverSessionGetResponse>(buildDiscoverSessionPath(id), {
          version: DISCOVER_SESSION_API_VERSION,
        }),
      () => new SavedObjectNotFound({ type: SavedSearchType, id })
    ),

  upsert: (id, data) =>
    requestWithReadableError(() =>
      http.put<DiscoverSessionApiResponse>(buildDiscoverSessionPath(id), {
        version: DISCOVER_SESSION_API_VERSION,
        body: JSON.stringify(data),
      })
    ),
});

/** Builds the path for one Discover session. */
const buildDiscoverSessionPath = (id: string): string =>
  buildPath(`${DISCOVER_SESSION_API_BASE_PATH}/{id}`, { id });

/** Preserves server error details while allowing callers to handle missing sessions separately. */
const requestWithReadableError = async <T>(
  request: () => Promise<T>,
  getNotFoundError?: () => Error
): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    if (getNotFoundError && isHttpFetchError(error) && error.response?.status === 404) {
      throw getNotFoundError();
    }

    const message = getResponseErrorMessage(error);
    if (message) {
      throw new Error(message, { cause: error });
    }

    throw error;
  }
};

/** Returns the human-readable message included in an HTTP error response. */
const getResponseErrorMessage = (error: unknown): string | undefined => {
  if (!isHttpFetchError(error) || !error.body || typeof error.body !== 'object') {
    return undefined;
  }

  const { message } = error.body as { message?: unknown };
  return typeof message === 'string' ? message : undefined;
};
