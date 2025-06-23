/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, PluginInitializerContext } from '@kbn/core/server';

import { EsqlService } from '../services/esql_service';

export const registerGetJoinIndicesRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.get(
    {
      path: '/internal/esql/autocomplete/join/indices',
      validate: {},
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    async (requestHandlerContext, request, response) => {
      try {
        const core = await requestHandlerContext.core;
        const service = new EsqlService({ client: core.elasticsearch.client.asCurrentUser });
        const result = await service.getIndicesByIndexMode('lookup');

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
