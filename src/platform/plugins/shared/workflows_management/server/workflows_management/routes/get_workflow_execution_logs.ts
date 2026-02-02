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
import { WORKFLOW_EXECUTION_READ_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';

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
      security: WORKFLOW_EXECUTION_READ_SECURITY,
      validate: {
        params: schema.object({
          workflowExecutionId: schema.string(),
        }),
        query: schema.object({
          stepExecutionId: schema.maybe(schema.string()),
          size: schema.number({ min: 1, max: 1000, defaultValue: 100 }),
          page: schema.number({ min: 1, defaultValue: 1 }),
          sortField: schema.maybe(schema.string()),
          sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { workflowExecutionId } = request.params;
        const { size, page, sortField, sortOrder, stepExecutionId } = request.query;
        const spaceId = spaces.getSpaceId(request);

        const logs = await api.getWorkflowExecutionLogs({
          executionId: workflowExecutionId,
          size,
          page,
          sortField,
          sortOrder,
          stepExecutionId,
          spaceId,
        });

        return response.ok({
          body: logs,
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
