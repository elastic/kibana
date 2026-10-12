/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, WorkflowExecutionHistoryModel } from '@kbn/workflows';
import { isIndexNotFoundError } from './lib/query';
import type { ExecutionReadDeps, GetLatestExecutionByWorkflowParams } from './types';

interface LatestExecutionBucket {
  key: string;
  recent_executions: {
    hits: { hits: Array<{ _source?: EsWorkflowExecution }> };
  };
}

/**
 * Returns the latest finished execution for each workflow id, one item per workflow.
 * An empty `workflowIds` list returns an empty record and does not query.
 * Documents missing `spaceId` are included. A missing index returns an empty record.
 */
export const getLatestExecutionByWorkflow = async (
  deps: ExecutionReadDeps,
  { workflowIds, spaceId }: GetLatestExecutionByWorkflowParams
): Promise<Record<string, WorkflowExecutionHistoryModel[]>> => {
  if (workflowIds.length === 0) {
    return {};
  }

  try {
    const response = await deps.workflowExecutionsDataClient.search({
      size: 0,
      query: {
        bool: {
          must: [
            { terms: { workflowId: [...workflowIds] } },
            {
              bool: {
                should: [
                  { term: { spaceId } },
                  { bool: { must_not: { exists: { field: 'spaceId' } } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      aggs: {
        workflows: {
          terms: { field: 'workflowId', size: workflowIds.length },
          aggs: {
            recent_executions: {
              top_hits: { size: 1, sort: [{ finishedAt: { order: 'desc' } }] },
            },
          },
        },
      },
    });

    const result: Record<string, WorkflowExecutionHistoryModel[]> = {};
    const aggregate = response.aggregations?.workflows;
    if (!aggregate || !('buckets' in aggregate) || !Array.isArray(aggregate.buckets)) {
      return result;
    }

    for (const bucket of aggregate.buckets as LatestExecutionBucket[]) {
      const execution = bucket.recent_executions.hits.hits[0]?._source;
      if (execution) {
        result[bucket.key] = [
          {
            id: execution.id,
            workflowId: execution.workflowId,
            workflowName: execution.workflowDefinition?.name || 'Unknown Workflow',
            status: execution.status,
            startedAt: execution.startedAt,
            finishedAt: execution.finishedAt || execution.startedAt,
            duration:
              execution.finishedAt && execution.startedAt
                ? new Date(execution.finishedAt).getTime() - new Date(execution.startedAt).getTime()
                : null,
          },
        ];
      }
    }
    return result;
  } catch (error) {
    if (!isIndexNotFoundError(error)) {
      deps.logger.error(`Failed to fetch recent executions for workflows: ${error}`);
    }
    return {};
  }
};
