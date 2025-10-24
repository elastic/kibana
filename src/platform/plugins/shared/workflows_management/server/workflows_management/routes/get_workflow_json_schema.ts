/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { ADMIN_SECURITY } from './route_security';
import { handleRouteError } from './route_error_handlers';

export function registerGetWorkflowJsonSchemaRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workflows/workflow-json-schema',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: ADMIN_SECURITY,
      validate: {
        query: schema.object({
          loose: schema.boolean(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { loose } = request.query;
        const spaceId = spaces.getSpaceId(request);
        const jsonSchema = await api.getWorkflowJsonSchema({ loose }, spaceId, request);
        return response.ok({
          body: jsonSchema,
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    }
  );
}
