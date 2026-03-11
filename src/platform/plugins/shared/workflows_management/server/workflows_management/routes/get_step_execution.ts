/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';

export function registerGetStepExecutionRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.get(
    {
      path: '/api/workflowExecutions/{executionId}/steps/{id}',
      security: WORKFLOW_EXECUTION_READ_SECURITY,
      validate: {
        params: schema.object({
          executionId: schema.string(),
          id: schema.string(),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { executionId, id } = request.params;
        const stepExecution = await api.getStepExecution(
          { executionId, id },
          spaces.getSpaceId(request)
        );
        if (!stepExecution) {
          return response.notFound();
        }
        return response.ok({
          body: stepExecution,
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
