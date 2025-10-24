/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_CREATE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';

export function registerPostCloneWorkflowRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/{id}/clone',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_CREATE_SECURITY,
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
        const workflow = await api.getWorkflow(id, spaceId);
        if (!workflow) {
          return response.notFound();
        }
        const createdWorkflow = await api.cloneWorkflow(workflow, spaceId, request);
        return response.ok({ body: createdWorkflow });
      } catch (error) {
        return handleRouteError(response, error);
      }
    }
  );
}
