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
import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';

import type { EsqlServerPluginStart } from '../types';

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
        const { query } = request.body;
        const [, { inference }] = await getStartServices();

        const defaultConnector = await inference.getDefaultConnector(request);

        const result = await lastValueFrom(
          naturalLanguageToEsql({
            client: inference.getClient({ request }),
            connectorId: defaultConnector.connectorId,
            input: query,
            functionCalling: 'auto',
            logger,
            system: "Just produce the query fenced by the esql tag. Don't explain it.",
          })
        );
        return response.ok({
          body: result,
        });
      } catch (error) {
        logger.debug(error);
        throw error;
      }
    }
  );
};
