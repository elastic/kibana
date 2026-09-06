/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Under the Elastic License 2.0, the
 * GNU AGPLv3, or the SSPLv1, at your election.
 */
import path from 'path';
import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, MAX_PAGE_SIZE, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import {
  assertCanReadManagedWorkflowExecution,
  WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
} from '../utils/route_security';
import { workflowIdParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';
import { aggregateExecutionHistory } from '../../../lib/execution_history';

/**
 * WF-007: workflow execution history aggregation endpoint for ops dashboards.
 * Aggregates executions of one workflow into daily buckets (counts, failures,
 * average duration) over a rolling window (default 30 days).
 */
export function registerGetWorkflowExecutionHistoryRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/api/workflows/workflow/{workflowId}/execution_history',
      access: 'public',
      security: WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
      summary: 'Get workflow execution history',
      description:
        'Aggregated execution history for a workflow: daily buckets of total/failed/succeeded counts and average duration, for ops dashboards.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/get_workflow_execution_history.yaml'),
        },
        validate: {
          request: {
            params: workflowIdParamSchema,
            query: schema.object({
              days: schema.maybe(
                schema.number({ min: 1, max: 90, meta: { description: 'Rolling window size in days (default 30).' } })
              ),
            }),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const { workflowId } = request.params;
          const workflow = await api.getWorkflow(workflowId, spaceId);
          assertCanReadManagedWorkflowExecution(request, workflow);
          const days = request.query.days ?? 30;
          const list = await api.getWorkflowExecutions(
            {
              workflowId,
              startedAfter: `now-${days}d`,
              page: 1,
              size: MAX_PAGE_SIZE,
              omitStepRuns: true,
            },
            spaceId
          );
          const summary = aggregateExecutionHistory(
            workflowId,
            list.executions ?? [],
            days
          );
          return response.ok({ body: summary });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
