/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import type { ESQLExtensionsRegistry } from '../extensions_registry';
import type { ResolveIndexResponse } from '../types';

export const registerESQLExtensionsRoute = (
  router: IRouter,
  extensionsRegistry: ESQLExtensionsRegistry,
  { logger }: PluginInitializerContext
) => {
  router.get(
    {
      path: '/internal/esql_registry/extensions/{query}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        params: schema.object({
          query: schema.string(),
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const core = await requestHandlerContext.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const { query } = request.params;
      try {
        const sources = (await client.indices.resolveIndex({
          name: '*',
          expand_wildcards: 'open',
        })) as ResolveIndexResponse;
        // return the recommended queries for now, we will add more extensions later
        const recommendedQueries = extensionsRegistry.getRecommendedQueries(query, sources);
        if (recommendedQueries.length === 0) {
          return response.notFound({
            body: { message: `No ESQL extensions found for query: ${query}` },
          });
        }

        return response.ok({
          body: recommendedQueries,
        });
      } catch (error) {
        logger.get().debug(error);
        throw error;
      }
    }
  );
};
