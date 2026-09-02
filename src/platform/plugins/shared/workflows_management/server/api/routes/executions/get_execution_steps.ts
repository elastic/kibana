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
import { API_VERSION, AVAILABILITY, MAX_PAGE_SIZE, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import {
  assertCanReadManagedWorkflowExecution,
  WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
} from '../utils/route_security';
import { executionIdParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerGetExecutionStepsRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/api/workflows/executions/{executionId}/steps',
      access: 'public',
      security: WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
      summary: 'Get execution step executions',
      description:
        'Retrieve a paginated list of step executions for a specific workflow execution. Does not include step input or output; fetch those with GET /api/workflows/executions/{executionId}/step/{stepExecutionId}.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/get_execution_steps.yaml'),
        },
        validate: {
          request: {
            params: executionIdParamSchema,
            query: schema.object({
              page: schema.number({
                min: 1,
                defaultValue: 1,
                meta: { description: 'Page number.' },
              }),
              size: schema.number({
                min: 1,
                max: MAX_PAGE_SIZE,
                defaultValue: 100,
                meta: { description: 'Number of step executions per page.' },
              }),
            }),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { executionId } = request.params;
          const { page, size } = request.query;
          const spaceId = spaces.getSpaceId(request);
          const workflowExecution = await api.getWorkflowExecution(executionId, spaceId, {
            omitStepExecutions: true,
          });
          if (!workflowExecution) {
            return response.notFound();
          }
          assertCanReadManagedWorkflowExecution(request, workflowExecution);

          return response.ok({
            body: await api.getExecutionStepExecutions(
              {
                executionId,
                page,
                size,
              },
              spaceId
            ),
          });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
