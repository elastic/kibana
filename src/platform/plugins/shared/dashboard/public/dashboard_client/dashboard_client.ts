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
import type { Reference } from '@kbn/content-management-utils';
import type { DashboardSearchRequestBody, DashboardSearchResponseBody } from '../../server';
import { CONTENT_ID, DASHBOARD_API_VERSION } from '../../common/content_management/constants';
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
  create: async (dashboardState: DashboardState, references: Reference[]) => {
    return coreServices.http.post<DashboardCreateResponseBody>(`/api/dashboards/dashboard`, {
      version: DASHBOARD_API_VERSION,
      body: JSON.stringify({
        data: {
          ...dashboardState,
          references,
        },
      }),
    });
  },
  delete: async (id: string): Promise<DeleteResult> => {
    cache.delete(id);
    return coreServices.http.delete(`/api/dashboards/dashboard/${id}`, {
      version: DASHBOARD_API_VERSION,
    });
  },
  get: async (id: string): Promise<DashboardReadResponseBody> => {
    if (cache.has(id)) {
      return cache.get(id)!;
    }

    const result = await coreServices.http
      .get<DashboardReadResponseBody>(`/api/dashboards/dashboard/${id}`, {
        version: DASHBOARD_API_VERSION,
      })
      .catch((e) => {
        if (e.response?.status === 404) {
          throw new SavedObjectNotFound({ type: CONTENT_ID, id });
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
    return await coreServices.http.post<DashboardSearchResponseBody>(`/api/dashboards/search`, {
      version: DASHBOARD_API_VERSION,
      body: JSON.stringify({
        ...searchBody,
        search: searchBody.search ? `${searchBody.search}*` : undefined,
      }),
    });
  },
  update: async (id: string, dashboardState: DashboardState, references: Reference[]) => {
    const updateResponse = await coreServices.http.put<DashboardUpdateResponseBody>(
      `/api/dashboards/dashboard/${id}`,
      {
        version: DASHBOARD_API_VERSION,
        body: JSON.stringify({
          data: {
            ...dashboardState,
            references,
          },
        }),
      }
    );
    cache.delete(id);
    return updateResponse;
  },
};
