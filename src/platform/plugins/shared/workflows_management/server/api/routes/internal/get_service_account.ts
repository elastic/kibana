/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import {
  assertCanReadManagedWorkflow,
  assertCanReadManagedWorkflowExecution,
  hasWorkflowReadPrivilege,
  WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
  WORKFLOW_READ_WITH_MANAGED_SECURITY,
} from '../utils/route_security';
import { executionIdParamSchema, idParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

/**
 * Names the service account of a workflow, or of one of its executions, for any user who can read
 * it. Reading service accounts directly takes `manage_security`, which most users who run or
 * review workflows do not have. The workflow read is the authorization here, so these routes
 * never name an account the caller picks.
 */
export function registerGetServiceAccountRoutes({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/internal/workflows/workflow/{id}/service_account',
      access: 'internal',
      security: WORKFLOW_READ_WITH_MANAGED_SECURITY,
      summary: 'Get the service account a workflow runs as',
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { params: idParamSchema } } },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          if (!hasWorkflowReadPrivilege(request)) {
            return response.forbidden();
          }
          const result = await api.getWorkflowServiceAccount(
            request.params.id,
            spaces.getSpaceId(request),
            request
          );
          if (!result) {
            return response.notFound({ body: { message: 'Workflow not found' } });
          }
          assertCanReadManagedWorkflow(request, result.workflow);
          return response.ok({ body: { serviceAccount: result.serviceAccount } });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );

  router.versioned
    .get({
      path: '/internal/workflows/executions/{executionId}/service_account',
      access: 'internal',
      security: WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
      summary: 'Get the service account a workflow execution ran as',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { params: executionIdParamSchema } },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const result = await api.getWorkflowExecutionServiceAccount(
            request.params.executionId,
            spaces.getSpaceId(request),
            request
          );
          if (!result) {
            return response.notFound();
          }
          assertCanReadManagedWorkflowExecution(request, result.execution);
          return response.ok({ body: { serviceAccount: result.serviceAccount } });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
