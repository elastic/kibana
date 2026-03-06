/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type {
  EsWorkflowExecution,
  WorkflowExecutionHistoryModel,
} from '@kbn/workflows/types/latest';
import { WORKFLOWS_EXECUTION_STATE_INDEX } from '../../../common/mappings';
import { WORKFLOWS_EXECUTIONS_DATA_STREAM } from '../workflow_execution_repository/constants';

export function getRecentExecutionsForWorkflowsFn(esClient: ElasticsearchClient, logger: Logger) {
  /**
   * Efficiently fetch the most recent execution for multiple workflows
   */
  return async (
    workflowIds: string[],
    spaceId: string
  ): Promise<Record<string, WorkflowExecutionHistoryModel[]>> => {
    if (workflowIds.length === 0) {
      return {};
    }

    try {
      const response = await esClient.search<EsWorkflowExecution>({
        index: [WORKFLOWS_EXECUTIONS_DATA_STREAM, WORKFLOWS_EXECUTION_STATE_INDEX],
        size: 0, // We only want aggregations
        query: {
          bool: {
            must: [
              { terms: { workflowId: workflowIds } },
              {
                bool: {
                  should: [
                    { term: { spaceId } },
                    // Backward compatibility for objects without spaceId
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
            terms: {
              field: 'workflowId',
              size: workflowIds.length,
            },
            aggs: {
              recent_executions: {
                top_hits: {
                  size: 1, // Get only the most recent execution per workflow
                  sort: [{ finishedAt: { order: 'desc' } }],
                },
              },
            },
          },
        },
      });

      const result: Record<string, WorkflowExecutionHistoryModel[]> = {};

      if (response.aggregations?.workflows && 'buckets' in response.aggregations.workflows) {
        const buckets = response.aggregations.workflows.buckets as Array<{
          key: string;
          recent_executions: {
            hits: {
              hits: Array<{
                _source: EsWorkflowExecution;
              }>;
            };
          };
        }>;

        buckets.forEach((bucket) => {
          const workflowId = bucket.key;
          const hits = bucket.recent_executions.hits.hits;

          if (hits.length > 0) {
            const execution = hits[0]._source;
            result[workflowId] = [
              {
                id: execution.id,
                workflowId: execution.workflowId,
                workflowName: execution.workflowDefinition?.name || 'Unknown Workflow',
                status: execution.status,
                startedAt: execution.startedAt,
                finishedAt: execution.finishedAt || execution.startedAt,
                duration:
                  execution.finishedAt && execution.startedAt
                    ? new Date(execution.finishedAt).getTime() -
                      new Date(execution.startedAt).getTime()
                    : null,
              },
            ];
          }
        });
      }

      return result;
    } catch (error) {
      // Index not found is expected when no workflows have been executed yet
      if (!isResponseError(error) || error.body?.error?.type !== 'index_not_found_exception') {
        logger.error(`Failed to fetch recent executions for workflows: ${error}`);
      }
      return {};
    }
  };
}
