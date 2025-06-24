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
import { type ResolveIndexResponse, REGISTRY_EXTENSIONS_ROUTE } from '@kbn/esql-types';
import type { ESQLExtensionsRegistry } from '../extensions_registry';

type SolutionId = 'es' | 'oblt' | 'security';

/**
 * Type guard to check if a string is a valid SolutionId.
 * @param str The string to check.
 * @returns True if the string is a valid SolutionId, false otherwise.
 */
function isSolutionId(str: string): str is SolutionId {
  return ['es', 'oblt', 'security'].includes(str as SolutionId);
}

/**
 * Registers the ESQL extensions route.
 * This route handles requests for ESQL extensions based on the provided solutionId and query.
 *
 * @param router The IRouter instance to register the route with.
 * @param extensionsRegistry The ESQLExtensionsRegistry instance to use for fetching recommended queries.
 * @param logger The logger instance from the PluginInitializerContext.
 */
export const registerESQLExtensionsRoute = (
  router: IRouter,
  extensionsRegistry: ESQLExtensionsRegistry,
  { logger }: PluginInitializerContext
) => {
  router.get(
    {
      path: `${REGISTRY_EXTENSIONS_ROUTE}{solutionId}/{query}`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        params: schema.object({
          solutionId: schema.oneOf(
            [
              schema.literal('es'),
              schema.literal('oblt'),
              schema.literal('security'),
              schema.literal('chat'),
            ],
            {
              defaultValue: 'oblt', // Default to 'oblt' if no solutionId is provided
            }
          ),
          query: schema.string(),
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const core = await requestHandlerContext.core;
      const client = core.elasticsearch.client.asCurrentUser;
      const { query, solutionId } = request.params;
      try {
        const localSources = (await client.indices.resolveIndex({
          name: '*',
          expand_wildcards: 'open',
        })) as ResolveIndexResponse;

        const ccsSources = (await client.indices.resolveIndex({
          name: '*:*',
          expand_wildcards: 'open',
        })) as ResolveIndexResponse;

        const sources = {
          indices: [...(localSources.indices ?? []), ...(ccsSources.indices ?? [])],
          aliases: [...(localSources.aliases ?? []), ...(ccsSources.aliases ?? [])],
          data_streams: [...(localSources.data_streams ?? []), ...(ccsSources.data_streams ?? [])],
        };

        // Validate solutionId
        const validSolutionId = isSolutionId(solutionId) ? solutionId : 'oblt'; // No solutionId provided, or invalid

        const recommendedQueries = extensionsRegistry.getRecommendedQueries(
          query,
          sources,
          validSolutionId
        );

        const recommendedFields = extensionsRegistry.getRecommendedFields(
          query,
          sources,
          validSolutionId
        );

        return response.ok({
          body: {
            recommendedQueries,
            recommendedFields,
          },
        });
      } catch (error) {
        logger.get().debug(error);
        throw error;
      }
    }
  );
};
