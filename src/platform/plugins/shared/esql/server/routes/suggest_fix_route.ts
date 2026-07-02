/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import { SUGGEST_FIX_ROUTE } from '@kbn/esql-types';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import type { EsqlServerPluginStart } from '../types';
import { createScopedModel, resolveConnectorId } from './helpers';

const buildSuggestFixContext = (queryString: string, errorMessage: string): string =>
  [
    'The user is in the ES|QL editor and their query has an error.',
    '',
    '<current_query>',
    queryString,
    '</current_query>',
    '',
    '<error_message>',
    errorMessage,
    '</error_message>',
    '',
    "Return a corrected ES|QL query that resolves the error while preserving the user's intent.",
  ].join('\n');

export const registerSuggestFixRoute = (
  router: IRouter,
  getStartServices: CoreSetup<EsqlServerPluginStart>['getStartServices'],
  context: PluginInitializerContext
) => {
  router.post(
    {
      path: SUGGEST_FIX_ROUTE,
      validate: {
        body: schema.object({
          queryString: schema.string({ maxLength: 50000 }),
          errorMessage: schema.string({ maxLength: 4000 }),
          errorCode: schema.maybe(schema.nullable(schema.string({ maxLength: 1000 }))),
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
        const { queryString, errorMessage } = request.body;
        const core = await requestHandlerContext.core;
        const client = core.elasticsearch.client.asCurrentUser;
        const [, { inference, searchInferenceEndpoints }] = await getStartServices();

        const connectorId = await resolveConnectorId({
          inference,
          request,
          searchInferenceEndpoints,
        });

        if (!connectorId) {
          return response.badRequest({
            body: {
              message: 'No AI connector available.',
            },
          });
        }

        const model = await createScopedModel({ inference, request, connectorId });

        const result = await generateEsql({
          model,
          esClient: client,
          logger,
          nlQuery: 'Fix the following ES|QL query. Return only the corrected query.',
          additionalContext: buildSuggestFixContext(queryString, errorMessage),
          executeQuery: false,
        });

        return response.ok({
          body: { content: result.query },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`ES|QL suggest fix failed: ${errorMessage}`);
        if (
          error instanceof Error &&
          'reason' in error &&
          typeof (error as { reason: string }).reason === 'string' &&
          (error as { reason: string }).reason.startsWith('license_')
        ) {
          return response.forbidden({
            body: { message: errorMessage },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: errorMessage },
        });
      }
    }
  );
};
