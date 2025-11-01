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
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_EXECUTE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';

export function registerPostTestWorkflowRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/test',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTE_SECURITY,
      validate: {
        body: buildRouteValidationWithZod(
          z
            .object({
              workflowId: z.string().optional(),
              workflowYaml: z.string().optional(),
              inputs: z.record(z.string(), z.any()),
            })
            .refine((data) => data.workflowId || data.workflowYaml, {
              message: "Either 'workflowId' or 'workflowYaml' or both must be provided",
              path: ['workflowId', 'workflowYaml'],
            })
        ),
      },
    },
    async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);

        const workflowExecutionId = await api.testWorkflow({
          workflowId: request.body.workflowId,
          workflowYaml: request.body.workflowYaml,
          inputs: request.body.inputs,
          spaceId,
          request,
        });

        return response.ok({
          body: {
            workflowExecutionId,
          },
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    }
  );
}
