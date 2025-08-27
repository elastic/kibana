/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { lastValueFrom } from 'rxjs';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { schema } from '@kbn/config-schema';
import { type ResolveIndexResponse } from '@kbn/esql-types';
import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import { getIndexMappings, getConnectorList, getDefaultConnector } from './utils';

import type { EsqlServerPluginStart } from '../types';

// This is a PoC implementation, needs to be tested for tokens etc

/**
 * Register the route for converting natural language to ESQL.
 * @param router The router instance to register the route with.
 * @param getStartServices A function to get the start services.
 * @param context The plugin initializer context.
 */

export const registerNLtoESQLRoute = (
  router: IRouter,
  getStartServices: CoreSetup<EsqlServerPluginStart>['getStartServices'],
  context: PluginInitializerContext
) => {
  router.post(
    {
      path: '/internal/esql/nl_to_esql',
      validate: {
        body: schema.object({
          query: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    async (requestHandlerContext, request, response) => {
      const logger = context.logger.get();
      try {
        const core = await requestHandlerContext.core;
        const client = core.elasticsearch.client.asCurrentUser;
        const localSources = (await client.indices.resolveIndex({
          name: '*',
          expand_wildcards: 'open',
        })) as ResolveIndexResponse;

        const sources = [...(localSources.indices?.map((index) => index.name) ?? [])];

        const mappings = await getIndexMappings({ indices: sources, esClient: client });

        const { query } = request.body as { query: string };
        const [, { inference, actions }] = await getStartServices();

        const connectors = await getConnectorList({ actions, request });
        const connector = getDefaultConnector({ connectors });

        const result = await lastValueFrom(
          naturalLanguageToEsql({
            client: inference.getClient({ request }),
            connectorId: connector.connectorId,
            input: `
        Your task is to generate an ES|QL query given a natural language query from the user.

        - Natural language query: "${query}",
        - The index might be mentioned in the query "${query}". So try to find it from there.
        - If you find the index, you can use it to narrow down the search.
        - Otherwise, the index to use must be among these sources "${sources.join(
          ', '
        )}". Instead of listing a list of the same indices you can use the astersik wildcard
        - When you find the index you can get the fields mapping from the mappings
        \`\`\`json
        ${JSON.stringify(mappings, undefined, 2)}
        \`\`\`

        Given those info, please generate an ES|QL query to address the user request
        `,

            functionCalling: 'auto',
            logger,
            system: "Just produce the query fenced by the esql tag. Don't explain it.",
          })
        );
        return response.ok({
          body: result,
        });
      } catch (error) {
        logger.get().debug(error);
        throw error;
      }
    }
  );
};
