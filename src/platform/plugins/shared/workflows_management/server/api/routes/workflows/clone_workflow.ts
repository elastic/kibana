/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_CLONE_SECURITY } from '../utils/route_security';
import { idParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerCloneWorkflowRoute(deps: RouteDependencies) {
  const { router, api, spaces, audit } = deps;
  router.versioned
    .post({
      path: '/api/workflows/workflow/{id}/clone',
      access: 'public',
      security: WORKFLOW_CLONE_SECURITY,
      summary: 'Clone a workflow',
      description: 'Create a copy of an existing workflow.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/clone_workflow.yaml'),
        },
        validate: {
          request: {
            params: idParamSchema,
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { id } = request.params;
          const spaceId = spaces.getSpaceId(request);
          const workflow = await api.getWorkflow(id, spaceId);
          if (!workflow) {
            return response.notFound();
          }
          const createdWorkflow = await api.cloneWorkflow(workflow, spaceId, request);
          audit.logWorkflowCloned(request, {
            sourceId: id,
            newId: createdWorkflow.id,
          });
          return response.ok({ body: createdWorkflow });
        } catch (error) {
          audit.logWorkflowCloned(request, {
            sourceId: request.params.id,
            error,
          });
          return handleRouteError(response, error);
        }
      })
    );
}
