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
import { ADMIN_SECURITY } from './route_security';
import type { RouteDependencies } from './types';

export function registerPostTestStepRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/testStep',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: ADMIN_SECURITY,
      validate: {
        body: schema.object({
          stepId: schema.string(),
          contextOverride: schema.recordOf(schema.string(), schema.any()),
          workflowYaml: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);

        const workflowExecutionId = await api.testStep(
          request.body.workflowYaml,
          request.body.stepId,
          request.body.contextOverride,
          spaceId,
          request
        );

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
