/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { schema, type Type } from '@kbn/config-schema';
import type { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import { ExecutionStatusValues, ExecutionTypeValues } from '@kbn/workflows';
import type { SearchWorkflowExecutionsParams } from '../../workflows_management_service';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, MAX_PAGE_SIZE, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from '../utils/route_security';
import { workflowIdParamSchema } from '../utils/schemas';
import { withLicenseCheck } from '../utils/with_license_check';

const executionStatusSchema = schema.oneOf(
  ExecutionStatusValues.map((type) => schema.literal(type)) as [Type<ExecutionStatus>]
);
const executionTypeSchema = schema.oneOf(
  ExecutionTypeValues.map((type) => schema.literal(type)) as [Type<ExecutionType>]
);

export function registerGetWorkflowExecutionsRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/api/workflows/workflow/{workflowId}/executions',
      access: 'public',
      security: WORKFLOW_EXECUTION_READ_SECURITY,
      summary: 'Get workflow executions',
      description: 'Retrieve a paginated list of executions for a specific workflow.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../examples/get_workflow_executions.yaml'),
        },
        validate: {
          request: {
            params: workflowIdParamSchema,
            query: schema.object({
              statuses: schema.maybe(
                schema.oneOf(
                  [
                    executionStatusSchema,
                    schema.arrayOf(executionStatusSchema, {
                      maxSize: ExecutionStatusValues.length,
                    }),
                  ],
                  {
                    defaultValue: [],
                    meta: { description: 'Filter by execution status.' },
                  }
                )
              ),
              executionTypes: schema.maybe(
                schema.oneOf(
                  [
                    executionTypeSchema,
                    schema.arrayOf(executionTypeSchema, { maxSize: ExecutionTypeValues.length }),
                  ],
                  {
                    defaultValue: [],
                    meta: { description: 'Filter by execution type.' },
                  }
                )
              ),
              executedBy: schema.maybe(
                schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
                  defaultValue: [],
                  meta: { description: 'Filter by the user who triggered the execution.' },
                })
              ),
              omitStepRuns: schema.maybe(
                schema.boolean({
                  meta: { description: 'Whether to exclude step-level execution data.' },
                })
              ),
              page: schema.maybe(schema.number({ min: 1, meta: { description: 'Page number.' } })),
              size: schema.maybe(
                schema.number({
                  min: 1,
                  max: MAX_PAGE_SIZE,
                  meta: { description: 'Number of results per page.' },
                })
              ),
            }),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const { workflowId } = request.params;
          const executedBy = request.query.executedBy;
          const params: SearchWorkflowExecutionsParams = {
            workflowId,
            statuses: parseExecutionStatuses(request.query.statuses),
            executionTypes: parseExecutionTypes(request.query.executionTypes),
            executedBy: Array.isArray(executedBy)
              ? executedBy
              : executedBy
              ? [executedBy]
              : undefined,
            page: request.query.page,
            size: request.query.size,
            omitStepRuns: request.query.omitStepRuns,
          };
          return response.ok({
            body: await api.getWorkflowExecutions(params, spaceId),
          });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}

function parseExecutionStatuses(
  statuses: string | ExecutionStatus[] | undefined
): ExecutionStatus[] | undefined {
  if (!statuses) return undefined;
  return typeof statuses === 'string' ? ([statuses] as ExecutionStatus[]) : statuses;
}

function parseExecutionTypes(
  executionTypes?: ExecutionType | ExecutionType[] | undefined
): ExecutionType[] | undefined {
  if (!executionTypes) return undefined;
  return typeof executionTypes === 'string'
    ? ([executionTypes] as ExecutionType[])
    : executionTypes;
}
