/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { WORKFLOW_ROUTE_OPTIONS } from './lib/route_constants';
import { handleRouteError } from './lib/route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from './lib/route_security';
import type { RouteDependencies } from './lib/types';
import { parseExecutionStatuses, parseExecutionTypes } from './lib/types';
import { withLicenseCheck } from './lib/with_license_check';
import { API_VERSIONS, WORKFLOW_EXECUTIONS_API_PATHS } from '../../common/api/constants';
import {
  GetWorkflowExecutionsRequestParams,
  GetWorkflowExecutionsRequestQuery,
} from '../../common/model/api/workflow_executions.gen';
import type { SearchWorkflowExecutionsParams } from '../service/workflows_management_service';

export function registerGetWorkflowExecutionsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.versioned
    .get({
      access: 'public',
      path: WORKFLOW_EXECUTIONS_API_PATHS.LIST,
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTION_READ_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetWorkflowExecutionsRequestParams),
            query: buildRouteValidationWithZod(GetWorkflowExecutionsRequestQuery),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const executedBy = request.query.executedBy;
          const params: SearchWorkflowExecutionsParams = {
            workflowId: request.params.workflowId,
            statuses: parseExecutionStatuses(request.query.statuses),
            executionTypes: parseExecutionTypes(request.query.executionTypes),
            executedBy: Array.isArray(executedBy)
              ? executedBy
              : executedBy
              ? [executedBy]
              : undefined,
            page: request.query.page,
            size: request.query.size,
          };
          return response.ok({
            body: await api.getWorkflowExecutions(params, spaceId),
          });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
