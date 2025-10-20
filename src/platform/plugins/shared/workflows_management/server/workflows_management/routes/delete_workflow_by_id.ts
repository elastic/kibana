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
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { WORKFLOW_DELETE_SECURITY } from './route_security';
import { handleRouteError } from './route_error_handlers';

export function registerDeleteWorkflowByIdRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.delete(
    {
      path: '/api/workflows/{id}',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_DELETE_SECURITY,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        const spaceId = spaces.getSpaceId(request);
        await api.deleteWorkflows([id], spaceId, request);
        return response.ok();
      } catch (error) {
        return handleRouteError(response, error);
      }
    }
  );
}
