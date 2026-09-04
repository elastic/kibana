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
import { TIMESERIES_INDICES_AUTOCOMPLETE_ROUTE } from '@kbn/esql-types';
import { EsqlService } from '@kbn/esql-server-utils';

export const registerGetTimeseriesIndicesRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.get(
    {
      path: TIMESERIES_INDICES_AUTOCOMPLETE_ROUTE,
      validate: {
        query: schema.object({
          projectRouting: schema.maybe(schema.string({ maxLength: 1024 })),
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
        const core = await requestHandlerContext.core;
        const { projectRouting } = request.query;
        const service = new EsqlService({ client: core.elasticsearch.client.asCurrentUser });
        const result = await service.getIndicesByIndexMode(
          'time_series',
          undefined,
          projectRouting
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
