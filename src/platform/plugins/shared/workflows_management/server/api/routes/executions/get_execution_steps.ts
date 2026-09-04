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
import {
  WORKFLOW_EXECUTION_STEPS_MAX_PAGE_SIZE,
  WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
} from '../../../../common';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import {
  assertCanReadManagedWorkflowExecution,
  WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
} from '../utils/route_security';
import { executionIdParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export const executionStepsQuerySchema = schema.object({
  page: schema.number({
    min: 1,
    defaultValue: 1,
    meta: { description: 'Page number.' },
    validate: (value) => (Number.isInteger(value) ? undefined : 'page must be an integer'),
  }),
  size: schema.number({
    min: 1,
    max: WORKFLOW_EXECUTION_STEPS_MAX_PAGE_SIZE,
    defaultValue: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    meta: { description: 'Number of step executions per page.' },
    validate: (value) => (Number.isInteger(value) ? undefined : 'size must be an integer'),
  }),
});

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
            query: executionStepsQuerySchema,
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { executionId } = request.params;
          const { page, size } = request.query;
          const spaceId = spaces.getSpaceId(request);
          const { workflowExecution, stepExecutionListResult } =
            await api.getExecutionStepExecutions(
              {
                executionId,
                page,
                size,
              },
              spaceId
            );
          assertCanReadManagedWorkflowExecution(request, workflowExecution);

          return response.ok({
            body: stepExecutionListResult,
          });
        } catch (error) {
          return handleRouteError(response, error, { checkNotFound: true });
        }
      })
    );
}
