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
import type { SearchExecutionsViewParams } from '../../workflows_management_service';
import type { RouteDependencies } from '../types';
import {
  API_VERSION,
  AVAILABILITY,
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

const querySchema = schema.object({
  kql: schema.maybe(
    schema.string({
      maxLength: MAX_TRIGGER_EVENT_SEARCH_KQL_LENGTH,
      meta: { description: 'KQL query string to filter executions.' },
    })
  ),
  sortField: schema.maybe(
    schema.oneOf(
      ALLOWED_SORT_FIELDS.map((field) => schema.literal(field)) as [Type<AllowedSortField>],
      { meta: { description: `Field to sort by. One of: ${ALLOWED_SORT_FIELDS.join(', ')}.` } }
    )
  ),
  sortOrder: schema.maybe(
    schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      meta: { description: 'Sort direction.' },
    })
  ),
  from: schema.maybe(schema.number({ min: 0, meta: { description: 'Pagination offset.' } })),
  size: schema.maybe(
    schema.number({
      min: 1,
      max: 1000,
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
          const { kql, sortField, sortOrder, from, size, trackTotalHits } = request.query;

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

          const sort = sortField
            ? [{ [sortField]: { order: sortOrder ?? 'desc' } }]
            : undefined;

          const params: SearchExecutionsViewParams = {
            query: esQuery,
            sort,
            from,
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
