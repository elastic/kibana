/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { UpdateWorkflowCommandSchema } from '@kbn/workflows';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_UPDATE_SECURITY } from '../utils/route_security';
import { idParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerUpdateWorkflowRoute(deps: RouteDependencies) {
  const { router, api, spaces, audit } = deps;
  router.versioned
    .put({
      path: '/api/workflows/workflow/{id}',
      access: 'public',
      security: WORKFLOW_UPDATE_SECURITY,
      summary: 'Update a workflow',
      description:
        'Partially update an existing workflow. You can update individual fields such as name, description, enabled state, tags, or the YAML definition without providing all fields.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/update_workflow.yaml'),
        },
        validate: {
          request: {
            params: idParamSchema,
            body: UpdateWorkflowCommandSchema.partial(),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { id } = request.params;
          const spaceId = spaces.getSpaceId(request);
          const updated = await api.updateWorkflow(id, request.body, spaceId, request);
          audit.logWorkflowUpdated(request, { id });
          return response.ok({ body: updated });
        } catch (error) {
          audit.logWorkflowUpdated(request, {
            id: request.params.id,
            error,
          });
          return handleRouteError(response, error);
        }
      })
    );
}
