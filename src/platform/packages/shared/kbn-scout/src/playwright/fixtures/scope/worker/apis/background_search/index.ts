/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';
import type { ApiClientFixture } from '../../api_client';
import {
  BACKGROUND_SEARCH_API_PATH,
  BACKGROUND_SEARCH_API_VERSION,
  BACKGROUND_SEARCH_FIND_PER_PAGE,
} from './constants';

export {
  BACKGROUND_SEARCH_API_PATH,
  BACKGROUND_SEARCH_API_VERSION,
  BACKGROUND_SEARCH_FIND_PER_PAGE,
} from './constants';

/**
 * Auth and space scoping for a background search request.
 *
 * `cookieHeader` is required because every background search is owned by the user that created
 * it: the API only ever returns that user's sessions. Unlike the other API services, this one is
 * therefore built on `apiClient` rather than the superuser `kbnClient` — a superuser request
 * would succeed and report nothing.
 */
export interface BackgroundSearchAuthOptions {
  cookieHeader: Record<string, string>;
  spaceId?: string;
}

export interface BackgroundSearchSavedObject {
  id: string;
}

export interface BackgroundSearchApiService {
  /** Every background search owned by the calling user in the given space. */
  find: (options: BackgroundSearchAuthOptions) => Promise<BackgroundSearchSavedObject[]>;
  /** Deletes a single background search by id. */
  delete: (id: string, options: BackgroundSearchAuthOptions) => Promise<void>;
  cleanup: {
    /** Deletes every background search owned by the calling user in the given space. */
    deleteAll: (options: BackgroundSearchAuthOptions) => Promise<void>;
  };
}

export const getBackgroundSearchApiHelper = (
  log: ScoutLogger,
  apiClient: ApiClientFixture
): BackgroundSearchApiService => {
  const apiPath = (spaceId: string | undefined, path: string = '') =>
    spaceId && spaceId !== 'default'
      ? `s/${spaceId}/${BACKGROUND_SEARCH_API_PATH}${path}`
      : `${BACKGROUND_SEARCH_API_PATH}${path}`;

  const apiHeaders = (cookieHeader: Record<string, string>) => ({
    [ELASTIC_HTTP_VERSION_HEADER]: BACKGROUND_SEARCH_API_VERSION,
    'kbn-xsrf': 'scout',
    ...cookieHeader,
  });

  const find: BackgroundSearchApiService['find'] = async ({ cookieHeader, spaceId }) =>
    measurePerformanceAsync(
      log,
      'backgroundSearchApi.find',
      async (): Promise<BackgroundSearchSavedObject[]> => {
        const response = await apiClient.post(apiPath(spaceId, '/_find'), {
          headers: apiHeaders(cookieHeader),
          body: {
            page: 1,
            perPage: BACKGROUND_SEARCH_FIND_PER_PAGE,
            sortField: 'created',
            sortOrder: 'asc',
          },
        });

        // A user without the `store_search_session` privilege cannot reach the API at all, and by
        // the same token owns no background searches.
        if (response.statusCode === 403) {
          return [];
        }

        if (response.statusCode !== 200) {
          throw new Error(
            `Failed to list background searches: ${response.statusCode} ${JSON.stringify(
              response.body
            )}`
          );
        }

        return response.body.saved_objects as BackgroundSearchSavedObject[];
      }
    );

  const deleteById: BackgroundSearchApiService['delete'] = async (id, { cookieHeader, spaceId }) =>
    measurePerformanceAsync(log, 'backgroundSearchApi.delete', async (): Promise<void> => {
      const response = await apiClient.delete(apiPath(spaceId, `/${id}`), {
        headers: apiHeaders(cookieHeader),
      });

      if (response.statusCode !== 200) {
        throw new Error(
          `Failed to delete background search "${id}": ${response.statusCode} ${JSON.stringify(
            response.body
          )}`
        );
      }
    });

  return {
    find,
    delete: deleteById,
    cleanup: {
      deleteAll: async (options) =>
        measurePerformanceAsync(
          log,
          'backgroundSearchApi.cleanup.deleteAll',
          async (): Promise<void> => {
            const savedObjects = await find(options);
            await Promise.all(savedObjects.map(({ id }) => deleteById(id, options)));
          }
        ),
    },
  };
};
