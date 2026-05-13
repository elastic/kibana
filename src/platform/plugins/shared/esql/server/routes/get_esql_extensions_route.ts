/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import { KIBANA_PROJECTS as VALID_SOLUTION_IDS } from '@kbn/projects-solutions-groups';
import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import {
  type ResolveIndexResponse,
  type ESQLRegistrySolutionId,
  REGISTRY_EXTENSIONS_ROUTE,
  ESQL_CLASSIC_SOLUTION_ID,
} from '@kbn/esql-types';
import type { ESQLExtensionsRegistry } from '../extensions_registry';

const VALID_REGISTRY_SOLUTION_IDS: readonly string[] = [
  ...VALID_SOLUTION_IDS,
  ESQL_CLASSIC_SOLUTION_ID,
];

/**
 * Type guard to check if a string is a valid ESQLRegistrySolutionId.
 * @param str The string to check.
 * @returns True if the string is a valid ESQLRegistrySolutionId, false otherwise.
 */
function isRegistrySolutionId(str: string): str is ESQLRegistrySolutionId {
  return VALID_REGISTRY_SOLUTION_IDS.includes(str);
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
              schema.literal('workplaceai'),
              schema.literal('vectordb'),
              schema.literal('classic'),
            ],
            {
              defaultValue: 'classic',
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

        const validSolutionId = isRegistrySolutionId(solutionId)
          ? solutionId
          : ESQL_CLASSIC_SOLUTION_ID;

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
