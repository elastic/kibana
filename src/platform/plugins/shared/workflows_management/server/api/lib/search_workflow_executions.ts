/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type {
  QueryDslQueryContainer,
  SearchResponse,
  Sort,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
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
}

export const searchWorkflowExecutions = async ({
  esClient,
  logger,
  workflowExecutionIndex,
  query,
  sort = [{ createdAt: 'desc' }],
  size = 100,
  from,
  page = 1,
}: SearchWorkflowExecutionsParams): Promise<WorkflowExecutionListDto> => {
  try {
    logger.debug(`Searching workflow executions in index ${workflowExecutionIndex}`);
    const response = await esClient.search<EsWorkflowExecution>({
      index: workflowExecutionIndex,
      query,
      sort,
      size,
      from,
      track_total_hits: true,
    });

    return transformToWorkflowExecutionListModel(response, page, size);
  } catch (error) {
    // Index not found is expected when no workflows have been executed yet
    if (isResponseError(error) && error.body?.error?.type === 'index_not_found_exception') {
      return {
        results: [],
        size,
        page,
        total: 0,
      };
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
    results: response.hits.hits.map((hit) => {
      const workflowExecution = hit._source!;
      return {
        spaceId: workflowExecution.spaceId,
        id: hit._id!,
        stepId: workflowExecution.stepId,
        status: workflowExecution.status,
        error: workflowExecution.error || null,
        isTestRun: workflowExecution.isTestRun ?? false,
        startedAt: workflowExecution.startedAt,
        finishedAt: workflowExecution.finishedAt,
        duration: workflowExecution.duration,
        workflowId: workflowExecution.workflowId,
        triggeredBy: workflowExecution.triggeredBy,
        executedBy: workflowExecution.executedBy ?? workflowExecution.createdBy,
      };
    }),
    size,
    page,
    total,
  };
}
