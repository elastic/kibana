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
import {
  WORKFLOW_MANAGED_UPDATE_SECURITY,
  WORKFLOW_UPDATE_SECURITY,
} from '../utils/route_security';
import { idParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const MANAGED_UPDATE_AVAILABILITY = { since: '9.5.0', stability: 'stable' } as const;

interface UpdateWorkflowRouteConfig {
  routePath: string;
  security: typeof WORKFLOW_UPDATE_SECURITY;
  summary: string;
  description: string;
  oasOperationFile: string;
  availability: typeof AVAILABILITY | typeof MANAGED_UPDATE_AVAILABILITY;
  allowManagedWorkflowMutation: boolean;
}

const registerUpdateWorkflowRouteForPath = (
  deps: RouteDependencies,
  {
    routePath,
    security,
    summary,
    description,
    oasOperationFile,
    availability,
    allowManagedWorkflowMutation,
  }: UpdateWorkflowRouteConfig
) => {
  const { router, api, spaces, audit } = deps;
  router.versioned
    .put({
      path: routePath,
      access: 'public',
      security,
      summary,
      description,
      options: {
        tags: [OAS_TAG],
        availability,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, oasOperationFile),
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
          const updated = await api.updateWorkflow(id, request.body, spaceId, request, {
            allowManagedWorkflowMutation,
          });
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
};

export function registerUpdateWorkflowRoute(deps: RouteDependencies) {
  registerUpdateWorkflowRouteForPath(deps, {
    routePath: '/api/workflows/workflow/{id}',
    security: WORKFLOW_UPDATE_SECURITY,
    summary: 'Update a workflow',
    description:
      'Partially update an existing workflow. You can update individual fields such as name, description, enabled state, tags, or the YAML definition without providing all fields.',
    oasOperationFile: '../examples/update_workflow.yaml',
    availability: AVAILABILITY,
    allowManagedWorkflowMutation: false,
  });

  registerUpdateWorkflowRouteForPath(deps, {
    routePath: '/api/workflows/managed/workflow/{id}',
    security: WORKFLOW_MANAGED_UPDATE_SECURITY,
    summary: 'Update a managed workflow',
    description:
      'Partially update an existing managed workflow. This elevated route can update fields beyond the enabled state.',
    oasOperationFile: '../examples/update_managed_workflow.yaml',
    availability: MANAGED_UPDATE_AVAILABILITY,
    allowManagedWorkflowMutation: true,
  });
}
