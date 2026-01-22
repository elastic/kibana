/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_EXECUTION_RESUME_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';

export function registerPostResumeWorkflowExecutionRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workflowExecutions/{workflowExecutionId}/resume',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTION_RESUME_SECURITY,
      validate: {
        params: schema.object({
          workflowExecutionId: schema.string(),
        }),
        body: schema.object({
          input: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { workflowExecutionId } = request.params;
        const { input } = request.body;
        const spaceId = spaces.getSpaceId(request);

        await api.resumeWorkflowExecution(workflowExecutionId, input, spaceId, request);
        return response.ok();
      } catch (error) {
        return handleRouteError(response, error, { checkNotFound: true });
      }
    })
  );
}
