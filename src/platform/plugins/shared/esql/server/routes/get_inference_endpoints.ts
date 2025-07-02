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
import { EsqlService } from '../services/esql_service';

export const registerGetInferenceEndpointsRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.get(
    {
      path: '/internal/esql/autocomplete/inference_endpoints/{taskType}',
      validate: {
        params: schema.object({
          taskType: schema.oneOf([
            schema.literal('completion'),
            schema.literal('rerank'),
            schema.literal('text_embedding'),
            schema.literal('sparse_embedding'),
            schema.literal('chat_completion'),
          ]),
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
        const service = new EsqlService({ client: core.elasticsearch.client.asCurrentUser });
        const result = await service.getInferenceEndpoints(request.params.taskType);

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
