/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { CreateWorkflowCommandSchema } from '@kbn/workflows';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_CREATE_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerCreateWorkflowRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .post({
      path: '/api/workflows/workflow',
      access: 'public',
      security: WORKFLOW_CREATE_SECURITY,
      summary: 'Create a workflow',
      description:
        'Create a new workflow from a YAML definition. The YAML is validated and parsed before the workflow is saved. An optional custom ID can be provided.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/create_workflow.yaml'),
        },
        validate: {
          request: {
            body: CreateWorkflowCommandSchema,
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const createdWorkflow = await api.createWorkflow(request.body, spaceId, request);
          return response.ok({ body: createdWorkflow });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
