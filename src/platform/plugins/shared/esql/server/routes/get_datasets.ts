/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import { DATASETS_ROUTE } from '@kbn/esql-types';
import { EsqlService } from '@kbn/esql-server-utils';

export const registerGetDatasetsRoute = (router: IRouter, { logger }: PluginInitializerContext) => {
  router.get(
    {
      path: DATASETS_ROUTE,
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
        const result = await service.getDatasets();

        return response.ok({
          body: result,
        });
      } catch (error) {
        logger.get().debug(error);
        // TODO: Add error logging back in when datasets are available in Tech preview
        // const message = error instanceof Error ? error.message : String(error);
        // logger.get().error(`Failed to fetch ES|QL datasets: ${message}`, {
        //   tags: ['esql', 'datasets'],
        //   error: { stack_trace: error instanceof Error ? error.stack : undefined },
        // });
        return response.ok({
          body: { datasets: [] },
        });
      }
    }
  );
};
