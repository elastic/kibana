/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { WORKFLOW_ROUTE_OPTIONS } from './lib/route_constants';
import { handleRouteError } from './lib/route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from './lib/route_security';
import type { RouteDependencies } from './lib/types';
import { withLicenseCheck } from './lib/with_license_check';
import { API_VERSIONS, WORKFLOWS_EXECUTIONS_API_PATHS } from '../../common/api/constants';

const GetExecutionByIdParamsSchema = z.object({ executionId: z.string() });

export function registerGetWorkflowExecutionByIdRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.versioned
    .get({
      access: 'public',
      path: WORKFLOWS_EXECUTIONS_API_PATHS.BY_ID,
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTION_READ_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetExecutionByIdParamsSchema),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const { executionId } = request.params;
          const spaceId = spaces.getSpaceId(request);
          const workflowExecution = await api.getWorkflowExecution(executionId, spaceId);
          if (!workflowExecution) {
            return response.notFound();
          }
          return response.ok({
            body: workflowExecution,
          });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
