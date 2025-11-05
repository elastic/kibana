/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { SOURCES_AUTOCOMPLETE_ROUTE } from '@kbn/esql-types';
import { EsqlService } from '../services/esql_service';

export const registerGetSourcesRoute = (router: IRouter, { logger }: PluginInitializerContext) => {
  router.get(
    {
      path: `${SOURCES_AUTOCOMPLETE_ROUTE}{scope}`,
      validate: {
        params: schema.object({
          scope: schema.oneOf([schema.literal('all'), schema.literal('local')], {
            defaultValue: 'local', // Default to 'local' if no scope is provided
          }),
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
      try {
        const { scope } = request.params;
        const core = await requestHandlerContext.core;
        const service = new EsqlService({ client: core.elasticsearch.client.asCurrentUser });
        const result = await service.getAllIndices(scope);

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
