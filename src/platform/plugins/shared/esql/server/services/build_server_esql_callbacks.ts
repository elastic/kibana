/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLCallbacks, ResolveIndexResponse } from '@kbn/esql-types';
import type { KibanaProject as SolutionId } from '@kbn/projects-solutions-groups';
import { EsqlService } from './esql_service';
import type { ESQLExtensionsRegistry } from '../extensions_registry';

interface BuildServerESQLCallbacksOptions {
  client: ElasticsearchClient;
  extensionsRegistry?: ESQLExtensionsRegistry;
  activeSolutionId?: SolutionId;
}

/**
 * Builds ESQLCallbacks for server-side usage, using the Elasticsearch client
 * directly instead of going through Kibana HTTP routes.
 *
 * This produces the same ESQLCallbacks shape that the client-side callbacks
 * (in @kbn/esql-utils) produce, but backed by the ES client for use in
 * server-side contexts like NL-to-ES|QL, validation, or agent workflows.
 */
export const buildServerESQLCallbacks = ({
  client,
  extensionsRegistry,
  activeSolutionId,
}: BuildServerESQLCallbacksOptions): ESQLCallbacks => {
  const service = new EsqlService({ client });

  const callbacks: ESQLCallbacks = {
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

    getJoinIndices: async (cacheOptions) => {
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

  if (extensionsRegistry && activeSolutionId) {
    callbacks.getEditorExtensions = async (queryString: string) => {
      const [localSources, ccsSources] = (await Promise.all([
        client.indices.resolveIndex({ name: '*', expand_wildcards: 'open' }),
        client.indices.resolveIndex({ name: '*:*', expand_wildcards: 'open' }),
      ])) as [ResolveIndexResponse, ResolveIndexResponse];

      const sources: ResolveIndexResponse = {
        indices: [...(localSources.indices ?? []), ...(ccsSources.indices ?? [])],
        aliases: [...(localSources.aliases ?? []), ...(ccsSources.aliases ?? [])],
        data_streams: [...(localSources.data_streams ?? []), ...(ccsSources.data_streams ?? [])],
      };

      return {
        recommendedQueries: extensionsRegistry.getRecommendedQueries(
          queryString,
          sources,
          activeSolutionId
        ),
        recommendedFields: extensionsRegistry.getRecommendedFields(
          queryString,
          sources,
          activeSolutionId
        ),
      };
    };
  }

  return callbacks;
};
