/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type Type } from '@kbn/config-schema';
import type { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import { ExecutionStatusValues, ExecutionTypeValues } from '@kbn/workflows';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from './route_security';
import { MAX_PAGE_SIZE, parseExecutionStatuses } from './types';
import type { RouteDependencies } from './types';
import type { SearchWorkflowExecutionsParams } from '../workflows_management_service';

export function registerGetWorkflowExecutionsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workflowExecutions',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTION_READ_SECURITY,
      validate: {
        // todo use shared params schema based on SearchWorkflowExecutionsParams type
        query: schema.object({
          workflowId: schema.string(),
          statuses: schema.maybe(
            schema.oneOf(
              [
                schema.oneOf(
                  ExecutionStatusValues.map((type) => schema.literal(type)) as [
                    Type<ExecutionStatus>
                  ]
                ),
                schema.arrayOf(
                  schema.oneOf(
                    ExecutionStatusValues.map((type) => schema.literal(type)) as [
                      Type<ExecutionStatus>
                    ]
                  )
                ),
              ],
              {
                defaultValue: [],
              }
            )
          ),
          executionTypes: schema.maybe(
            schema.oneOf(
              [
                schema.oneOf(
                  ExecutionTypeValues.map((type) => schema.literal(type)) as [Type<ExecutionType>]
                ),
                schema.arrayOf(
                  schema.oneOf(
                    ExecutionTypeValues.map((type) => schema.literal(type)) as [Type<ExecutionType>]
                  )
                ),
              ],
              {
                defaultValue: [],
              }
            )
          ),
          page: schema.maybe(schema.number({ min: 1 })),
          perPage: schema.maybe(schema.number({ min: 1, max: MAX_PAGE_SIZE })),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);
        const params: SearchWorkflowExecutionsParams = {
          workflowId: request.query.workflowId,
          statuses: parseExecutionStatuses(request.query.statuses),
          // Execution type filter is not supported yet
          // executionTypes: parseExecutionTypes(request.query.executionTypes),
          page: request.query.page,
          perPage: request.query.perPage,
        };
        return response.ok({
          body: await api.getWorkflowExecutions(params, spaceId),
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    }
  );
}
