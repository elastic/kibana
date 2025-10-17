/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CreateWorkflowCommandSchema } from '@kbn/workflows';
import type { RouteDependencies } from './types';
import { isWorkflowValidationError } from '../../../common/lib/errors';

export function registerPostCreateWorkflowRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows',
      options: {
        tags: ['api', 'workflows'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['all', 'workflow_create'],
            },
          ],
        },
      },
      validate: {
        body: CreateWorkflowCommandSchema,
      },
    },
    async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);
        const createdWorkflow = await api.createWorkflow(request.body, spaceId, request);
        return response.ok({ body: createdWorkflow });
      } catch (error) {
        if (isWorkflowValidationError(error)) {
          return response.badRequest({
            body: error.toJSON(),
          });
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
