/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LRUCache } from 'lru-cache';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import type { DeleteResult } from '@kbn/content-management-plugin/common';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { DashboardSearchRequestBody, DashboardSearchResponseBody } from '../../server';
import {
  DASHBOARD_API_PATH,
  DASHBOARD_API_VERSION,
  DASHBOARD_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type {
  DashboardCreateResponseBody,
  DashboardReadResponseBody,
  DashboardState,
  DashboardUpdateResponseBody,
} from '../../server';
import { coreServices } from '../services/kibana_services';

const CACHE_SIZE = 20; // only store a max of 20 dashboards
const CACHE_TTL = 1000 * 60 * 5; // time to live = 5 minutes

const cache = new LRUCache<string, DashboardReadResponseBody>({
  max: CACHE_SIZE,
  ttl: CACHE_TTL,
});

export const dashboardClient = {
  create: async (
    dashboardState: DashboardState,
    accessMode?: SavedObjectAccessControl['accessMode']
  ) => {
    return coreServices.http.post<DashboardCreateResponseBody>(DASHBOARD_API_PATH, {
      version: DASHBOARD_API_VERSION,
      query: {
        allowUnmappedKeys: true,
      },
      body: JSON.stringify({
        data: {
          ...dashboardState,
          ...(accessMode && { access_control: { access_mode: accessMode } }),
        },
      }),
    });
  },
  delete: async (id: string): Promise<DeleteResult> => {
    cache.delete(id);
    return coreServices.http.delete(`${DASHBOARD_API_PATH}/${id}`, {
      version: DASHBOARD_API_VERSION,
    });
  },
  get: async (id: string): Promise<DashboardReadResponseBody> => {
    if (cache.has(id)) {
      return cache.get(id)!;
    }

    const result = await coreServices.http
      .get<DashboardReadResponseBody>(`${DASHBOARD_API_PATH}/${id}`, {
        version: DASHBOARD_API_VERSION,
        query: {
          allowUnmappedKeys: true,
        },
      })
      .catch((e) => {
        if (e.response?.status === 404) {
          throw new SavedObjectNotFound({ type: DASHBOARD_SAVED_OBJECT_TYPE, id });
        }
        const message = (e.body as { message?: string })?.message ?? e.message;
        throw new Error(message);
      });

    if (result.meta.outcome !== 'aliasMatch') {
      /**
       * Only add the dashboard to the cache if it does not require a redirect - otherwise, the meta
       * alias info gets cached and prevents the dashboard contents from being updated
       */
      cache.set(id, result);
    }
    return result;
  },
  search: async (searchBody: DashboardSearchRequestBody) => {
    return await coreServices.http.post<DashboardSearchResponseBody>(
      `${DASHBOARD_API_PATH}/search`,
      {
        version: DASHBOARD_API_VERSION,
        body: JSON.stringify({
          ...searchBody,
          search: searchBody.search ? `${searchBody.search}*` : undefined,
        }),
      }
    );
  },
  update: async (id: string, dashboardState: DashboardState) => {
    const updateResponse = await coreServices.http.put<DashboardUpdateResponseBody>(
      `${DASHBOARD_API_PATH}/${id}`,
      {
        version: DASHBOARD_API_VERSION,
        query: {
          allowUnmappedKeys: true,
        },
        body: JSON.stringify({
          data: dashboardState,
        }),
      }
    );
    cache.delete(id);
    return updateResponse;
  },
  invalidateCache: async (id: string) => {
    if (cache.has(id)) {
      cache.delete(id);
    }
  },
};
