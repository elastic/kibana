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
          // Validate shape only. ES itself is the source of truth for which
          // task types are valid and rejects unknown ones with a clean 400.
          // Keeping an allowlist here would require a coordinated Kibana PR
          // every time ES adds a task type — see ESQL_INFERENCE_TASK_TYPES
          // in @kbn/esql-types for the Kibana-side list used by autocomplete.
          taskType: schema.string({
            maxLength: 64,
            validate: (value) =>
              /^[a-z_]+$/.test(value)
                ? undefined
                : 'must contain only lowercase letters and underscores',
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
