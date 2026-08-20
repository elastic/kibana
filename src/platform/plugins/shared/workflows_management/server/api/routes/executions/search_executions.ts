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
import { fromKueryExpression, KQLSyntaxError, toElasticsearchQuery } from '@kbn/es-query';
import type {
  ExecutionStatus,
  ExecutionType,
  WorkflowExecutionCollapseField,
} from '@kbn/workflows';
import {
  ExecutionStatusValues,
  ExecutionTypeValues,
  WorkflowExecutionCollapseFields,
} from '@kbn/workflows';
import type { SearchExecutionsViewParams } from '../../workflows_management_service';
import type { RouteDependencies } from '../types';
import {
  API_VERSION,
  AVAILABILITY,
  MAX_PAGE_SIZE,
  MAX_TRIGGER_EVENT_SEARCH_KQL_LENGTH,
  OAS_TAG,
} from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import {
  canReadManagedWorkflowExecutions,
  hasWorkflowExecutionReadPrivilege,
  WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
} from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const ALLOWED_SORT_FIELDS = ['startedAt', 'duration', 'workflowId', 'triggeredBy'] as const;
type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number];

const executionStatusSchema = schema.oneOf(
  ExecutionStatusValues.map((s) => schema.literal(s)) as [Type<ExecutionStatus>]
);
const executionTypeSchema = schema.oneOf(
  ExecutionTypeValues.map((t) => schema.literal(t)) as [Type<ExecutionType>]
);

const querySchema = schema.object({
  kql: schema.maybe(
    schema.string({
      maxLength: MAX_TRIGGER_EVENT_SEARCH_KQL_LENGTH,
      meta: { description: 'KQL query string to filter executions.' },
    })
  ),
  statuses: schema.maybe(
    schema.oneOf(
      [
        executionStatusSchema,
        schema.arrayOf(executionStatusSchema, { maxSize: ExecutionStatusValues.length }),
      ],
      { defaultValue: [], meta: { description: 'Filter by execution status.' } }
    )
  ),
  executionTypes: schema.maybe(
    schema.oneOf(
      [
        executionTypeSchema,
        schema.arrayOf(executionTypeSchema, { maxSize: ExecutionTypeValues.length }),
      ],
      { defaultValue: [], meta: { description: 'Filter by execution type.' } }
    )
  ),
  executedBy: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
      defaultValue: [],
      meta: { description: 'Filter by the user who triggered the execution.' },
    })
  ),
  concurrencyGroupKey: schema.maybe(
    schema.string({ meta: { description: 'Filter by evaluated concurrency group key.' } })
  ),
  startedAfter: schema.maybe(
    schema.string({
      meta: { description: 'Datemath lower bound for filtering executions by startedAt.' },
    })
  ),
  startedBefore: schema.maybe(
    schema.string({
      meta: { description: 'Datemath upper bound for filtering executions by startedAt.' },
    })
  ),
  finishedAfter: schema.maybe(
    schema.string({
      meta: { description: 'Datemath lower bound for filtering executions by finishedAt.' },
    })
  ),
  finishedBefore: schema.maybe(
    schema.string({
      meta: { description: 'Datemath upper bound for filtering executions by finishedAt.' },
    })
  ),
  collapse: schema.maybe(
    schema.oneOf(
      WorkflowExecutionCollapseFields.map((f) => schema.literal(f)) as [
        Type<WorkflowExecutionCollapseField>
      ],
      { meta: { description: 'Field to collapse execution results by.' } }
    )
  ),
  sortField: schema.maybe(
    schema.oneOf(ALLOWED_SORT_FIELDS.map((f) => schema.literal(f)) as [Type<AllowedSortField>], {
      meta: { description: `Field to sort by. One of: ${ALLOWED_SORT_FIELDS.join(', ')}.` },
    })
  ),
  sortOrder: schema.maybe(
    schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      meta: { description: 'Sort direction.' },
    })
  ),
  page: schema.maybe(schema.number({ min: 1, meta: { description: 'Page number.' } })),
  size: schema.maybe(
    schema.number({
      min: 1,
      max: MAX_PAGE_SIZE,
      meta: { description: 'Number of results to return.' },
    })
  ),
  trackTotalHits: schema.maybe(
    schema.boolean({ meta: { description: 'Whether to track total hit count.' } })
  ),
});

export function registerSearchExecutionsRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/api/workflows/workflow/executions',
      access: 'public',
      security: WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
      summary: 'Search workflow executions',
      description: 'Search across all workflow executions.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/search_executions.yaml'),
        },
        validate: {
          request: {
            query: querySchema,
          },
        },
      },
      withAvailabilityCheck(async (_context, request, response) => {
        try {
          if (!hasWorkflowExecutionReadPrivilege(request)) {
            return response.forbidden();
          }
          const spaceId = spaces.getSpaceId(request);
          const {
            kql,
            statuses,
            executionTypes,
            executedBy,
            concurrencyGroupKey,
            startedAfter,
            startedBefore,
            finishedAfter,
            finishedBefore,
            collapse,
            sortField,
            sortOrder,
            page,
            size,
            trackTotalHits,
          } = request.query;

          let esQuery;
          if (kql) {
            try {
              esQuery = toElasticsearchQuery(fromKueryExpression(kql));
            } catch (err) {
              if (err instanceof KQLSyntaxError) {
                return response.badRequest({ body: { message: `Invalid KQL: ${err.message}` } });
              }
              throw err;
            }
          }

          const params: SearchExecutionsViewParams = {
            query: esQuery,
            statuses: parseArray(statuses) as ExecutionStatus[] | undefined,
            executionTypes: parseArray(executionTypes) as ExecutionType[] | undefined,
            executedBy: parseArray(executedBy),
            concurrencyGroupKey,
            startedAfter,
            startedBefore,
            finishedAfter,
            finishedBefore,
            collapse,
            sortField,
            sortOrder,
            page,
            size,
            trackTotalHits,
            includeManagedExecutions: canReadManagedWorkflowExecutions(request),
          };

          return response.ok({
            body: await api.searchExecutionsView(params, spaceId),
          });
        } catch (error) {
          if (error instanceof Error && 'statusCode' in error && error.statusCode === 400) {
            return response.badRequest({ body: { message: error.message } });
          }
          return handleRouteError(response, error);
        }
      })
    );
}

function parseArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value : [value];
}
