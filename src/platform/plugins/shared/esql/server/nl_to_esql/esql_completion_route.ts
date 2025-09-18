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
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
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

export const registerESQLCompletionRoute = (
  router: IRouter,
  getStartServices: CoreSetup<EsqlServerPluginStart>['getStartServices'],
  context: PluginInitializerContext
) => {
  router.post(
    {
      path: '/internal/esql/esql_completion',
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
        const { query } = request.body as { query: string };

        const index = getIndexPatternFromESQLQuery(query);

        const mappings = await getIndexMappings({ indices: [index], esClient: client });

        const [, { inference, actions }] = await getStartServices();

        const connectors = await getConnectorList({ actions, request });
        const connector = getDefaultConnector({ connectors });

        const result = await lastValueFrom(
          naturalLanguageToEsql({
            client: inference.getClient({ request }),
            connectorId: connector.connectorId,
            input: `
        Your task is to complete the given ES|QL query from the user with potential suggestions.

        - Existing query: "${query}",
        - The index used is "${index}" and you can check the fields from the mappings:
        \`\`\`json
        ${JSON.stringify(mappings, undefined, 2)}
        \`\`\`

        Given those info, please generate ES|QL completions for this query
        `,

            functionCalling: 'auto',
            logger,
            system: "Just produce the queries. Don't explain them.",
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
