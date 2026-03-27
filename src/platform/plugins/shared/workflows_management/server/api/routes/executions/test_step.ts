/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTE_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerTestStepRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .post({
      path: '/api/workflows/step/test',
      access: 'public',
      security: WORKFLOW_EXECUTE_SECURITY,
      summary: 'Test a workflow step',
      description: 'Execute a single step from a workflow definition in test mode.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/test_step.yaml'),
        },
        validate: {
          request: {
            body: schema.object({
              stepId: schema.string({ meta: { description: 'ID of the step to test.' } }),
              workflowId: schema.maybe(
                schema.string({ meta: { description: 'ID of the workflow containing the step.' } })
              ),
              contextOverride: schema.recordOf(schema.string(), schema.any(), {
                meta: { description: 'Context overrides for the step execution.' },
              }),
              workflowYaml: schema.string({
                meta: { description: 'YAML definition of the workflow containing the step.' },
              }),
            }),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const workflowExecutionId = await api.testStep(
            request.body.workflowYaml,
            request.body.stepId,
            request.body.workflowId,
            request.body.contextOverride,
            spaceId,
            request
          );
          return response.ok({ body: { workflowExecutionId } });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
