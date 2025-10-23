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

export function registerGetWorkflowExecutionLogsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workflowExecutions/{workflowExecutionId}/logs',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: ADMIN_SECURITY,
      validate: {
        params: schema.object({
          workflowExecutionId: schema.string(),
        }),
        query: schema.object({
          stepExecutionId: schema.maybe(schema.string()),
          limit: schema.maybe(schema.number({ min: 1, max: 1000 })),
          offset: schema.maybe(schema.number({ min: 0 })),
          sortField: schema.maybe(schema.string()),
          sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { workflowExecutionId } = request.params;
        const { limit, offset, sortField, sortOrder, stepExecutionId } = request.query;
        const spaceId = spaces.getSpaceId(request);

        const logs = await api.getWorkflowExecutionLogs(
          {
            executionId: workflowExecutionId,
            limit,
            offset,
            sortField,
            sortOrder,
            stepExecutionId,
          },
          spaceId
        );

        return response.ok({
          body: logs,
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    }
  );
}
