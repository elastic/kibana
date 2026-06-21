/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  QueryDslQueryContainer,
  SearchResponse,
  Sort,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowExecutionListDto } from '@kbn/workflows';
import {
  getElasticsearchErrorMessage,
  isElasticsearchQueryError,
  isIndexNotFoundError,
} from './es_error_helpers';

interface SearchWorkflowExecutionsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowExecutionIndex: string;
  query: QueryDslQueryContainer;
  sort?: Sort;
  collapse?: { field: string };
  size?: number;
  from?: number;
  page?: number;
}

/** Fields required to build {@link WorkflowExecutionListDto} without fetching full execution snapshots. */
export const WORKFLOW_EXECUTION_LIST_SOURCE_INCLUDES = [
  'spaceId',
  'stepId',
  'status',
  'error',
  'isTestRun',
  'startedAt',
  'finishedAt',
  'duration',
  'workflowId',
  'triggeredBy',
  'executedBy',
  'createdBy',
  'concurrencyGroupKey',
] as const;

export const searchWorkflowExecutions = async ({
  esClient,
  logger,
  workflowExecutionIndex,
  query,
  sort = [{ createdAt: 'desc' }],
  collapse,
  size = 100,
  from,
  page = 1,
}: SearchWorkflowExecutionsParams): Promise<WorkflowExecutionListDto> => {
  try {
    logger.debug(`Searching workflow executions in index ${workflowExecutionIndex}`);
    const response = await esClient.search<EsWorkflowExecution>({
      index: workflowExecutionIndex,
      query,
      _source: { includes: [...WORKFLOW_EXECUTION_LIST_SOURCE_INCLUDES] },
      sort,
      size,
      from,
      collapse,
      track_total_hits: true,
    });

    return transformToWorkflowExecutionListModel(response, page, size);
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return {
        results: [],
        size,
        page,
        total: 0,
      };
    }

    if (isElasticsearchQueryError(error)) {
      const message = getElasticsearchErrorMessage(error) ?? 'Invalid search query';
      throw Object.assign(new Error(message), { statusCode: 400 });
    }

    logger.error(`Failed to search workflow executions: ${error}`);
    throw error;
  }
};

function transformToWorkflowExecutionListModel(
  response: SearchResponse<EsWorkflowExecution>,
  page: number,
  size: number
): WorkflowExecutionListDto {
  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  return {
    results: response.hits.hits.reduce<WorkflowExecutionListDto['results']>((acc, hit) => {
      const source = hit._source;
      const id = hit._id;
      if (id != null && source != null) {
        acc.push({
          spaceId: source.spaceId,
          id,
          stepId: source.stepId,
          status: source.status,
          error: source.error || null,
          isTestRun: source.isTestRun ?? false,
          startedAt: source.startedAt,
          finishedAt: source.finishedAt,
          duration: source.duration,
          workflowId: source.workflowId,
          workflowName: source.workflowDefinition?.name,
          tags: source.workflowDefinition?.tags,
          managed: source.managed,
          context: source.context,
          triggeredBy: source.triggeredBy,
          executedBy: source.executedBy ?? source.createdBy,
          concurrencyGroupKey: source.concurrencyGroupKey,
        });
      }
      return acc;
    }, []),
    size,
    page,
    total,
  };
}
