/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { ADMIN_SECURITY } from './route_security';
import { handleRouteError } from './route_error_handlers';

export function registerGetStepExecutionRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.get(
    {
      path: '/api/workflowExecutions/{executionId}/steps/{id}',
      security: ADMIN_SECURITY,
      validate: {
        params: schema.object({
          executionId: schema.string(),
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { executionId, id } = request.params;
        const stepExecution = await api.getStepExecution(
          { executionId, id },
          spaces.getSpaceId(request)
        );
        if (!stepExecution) {
          return response.notFound();
        }
        return response.ok({
          body: stepExecution,
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    }
  );
}
