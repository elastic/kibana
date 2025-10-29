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

interface SearchWorkflowExecutionsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowExecutionIndex: string;
  query: QueryDslQueryContainer;
  sort?: Sort;
  size?: number;
  from?: number;
  page?: number;
  perPage?: number;
}

export const searchWorkflowExecutions = async ({
  esClient,
  logger,
  workflowExecutionIndex,
  query,
  sort = [{ createdAt: 'desc' }],
  size,
  from,
  page = 1,
  perPage = 20,
}: SearchWorkflowExecutionsParams): Promise<WorkflowExecutionListDto> => {
  try {
    logger.info(`Searching workflow executions in index ${workflowExecutionIndex}`);
    const response = await esClient.search<EsWorkflowExecution>({
      index: workflowExecutionIndex,
      query,
      sort,
      size,
      from,
      track_total_hits: true,
    });

    return transformToWorkflowExecutionListModel(response, page, perPage);
  } catch (error) {
    logger.error(`Failed to search workflow executions: ${error}`);
    throw error;
  }
};

function transformToWorkflowExecutionListModel(
  response: SearchResponse<EsWorkflowExecution>,
  page: number,
  perPage: number
): WorkflowExecutionListDto {
  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  return {
    results: response.hits.hits.map((hit) => {
      const workflowExecution = hit._source!;
      return {
        spaceId: workflowExecution.spaceId,
        id: hit._id!,
        stepId: workflowExecution.stepId,
        status: workflowExecution.status,
        startedAt: workflowExecution.startedAt,
        finishedAt: workflowExecution.finishedAt,
        duration: workflowExecution.duration,
        workflowId: workflowExecution.workflowId,
        triggeredBy: workflowExecution.triggeredBy,
      };
    }),
    _pagination: {
      limit: perPage,
      page,
      total,
    },
  };
}
