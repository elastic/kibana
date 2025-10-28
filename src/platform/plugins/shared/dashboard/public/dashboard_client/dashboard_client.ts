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
import { CONTENT_ID } from '../../common/content_management/constants';
import type { DashboardGetOut } from '../../server/content_management';
import { coreServices } from '../services/kibana_services';

const CACHE_SIZE = 20; // only store a max of 20 dashboards
const CACHE_TTL = 1000 * 60 * 5; // time to live = 5 minutes

const cache = new LRUCache<string, DashboardGetOut>({
  max: CACHE_SIZE,
  ttl: CACHE_TTL,
});

export const dashboardClient = {
  get: async (id: string): Promise<DashboardGetOut> => {
    if (cache.has(id)) {
      return cache.get(id)!;
    }

    const result = (await coreServices.http.get(`/api/dashboards/dashboard/${id}`).catch((e) => {
      if (e.response?.status === 404) {
        throw new SavedObjectNotFound({ type: CONTENT_ID, id });
      }
      const message = (e.body as { message?: string })?.message ?? e.message;
      throw new Error(message);
    })) as DashboardGetOut;

    if (result.meta.outcome !== 'aliasMatch') {
      /**
       * Only add the dashboard to the cache if it does not require a redirect - otherwise, the meta
       * alias info gets cached and prevents the dashboard contents from being updated
       */
      cache.set(id, result);
    }
    return result;
  },
};
