/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { EsqlService } from './esql_service';

interface BuildServerESQLCallbacksOptions {
  client: ElasticsearchClient;
}

/**
 * Builds the ESQLCallbacks required by the ES|QL validation API
 * ({@link validateQuery} from @kbn/esql-language) for server-side usage.
 *
 * Uses the Elasticsearch client directly instead of going through
 * Kibana HTTP routes, unlike the client-side callbacks in @kbn/esql-utils.
 */
export const buildServerESQLCallbacks = ({
  client,
}: BuildServerESQLCallbacksOptions): ESQLCallbacks => {
  const service = new EsqlService({ client });

  return {
    getSources: async () => {
      return service.getAllIndices('all');
    },

    getColumnsFor: async ({ query } = { query: '' }) => {
      if (!query) return [];
      try {
        return await service.getColumns(query);
      } catch {
        return [];
      }
    },

    getPolicies: async () => {
      try {
        return await service.getPolicies();
      } catch {
        return [];
      }
    },

    getJoinIndices: async () => {
      return service.getIndicesByIndexMode('lookup');
    },

    getTimeseriesIndices: async () => {
      return service.getIndicesByIndexMode('time_series');
    },

    getViews: async () => {
      try {
        return await service.getViews();
      } catch {
        return { views: [] };
      }
    },

    getInferenceEndpoints: async (taskType) => {
      return service.getInferenceEndpoints(taskType);
    },
  };
};
