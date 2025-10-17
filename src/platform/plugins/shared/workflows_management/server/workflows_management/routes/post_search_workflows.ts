/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchWorkflowCommandSchema } from '@kbn/workflows';
import type { GetWorkflowsParams } from '../workflows_management_api';
import type { RouteDependencies } from './types';

export function registerPostSearchWorkflowsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/search',
      options: {
        tags: ['api', 'workflows'],
      },
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['read', 'workflow_read'],
            },
          ],
        },
      },
      validate: {
        body: SearchWorkflowCommandSchema,
      },
    },
    async (context, request, response) => {
      try {
        const { limit, page, enabled, createdBy, query } =
          request.body as unknown as GetWorkflowsParams;

        const spaceId = spaces.getSpaceId(request);
        return response.ok({
          body: await api.getWorkflows(
            {
              limit,
              page,
              enabled,
              createdBy,
              query,
            },
            spaceId
          ),
        });
      } catch (error) {
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
