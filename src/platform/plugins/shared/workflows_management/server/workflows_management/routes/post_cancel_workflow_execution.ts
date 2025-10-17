/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';
import type { RouteDependencies } from './types';

export function registerPostCancelWorkflowExecutionRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workflowExecutions/{workflowExecutionId}/cancel',
      options: {
        tags: ['api', 'workflows'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['read', 'workflow_execution_cancel'],
            },
          ],
        },
      },
      validate: {
        params: schema.object({
          workflowExecutionId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { workflowExecutionId } = request.params;
        const spaceId = spaces.getSpaceId(request);

        await api.cancelWorkflowExecution(workflowExecutionId, spaceId);
        return response.ok();
      } catch (error) {
        if (error instanceof WorkflowExecutionNotFoundError) {
          return response.notFound();
        }

        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    }
  );
}
