/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { QueryDslQueryContainer, SearchResponse, Sort } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EsWorkflowExecution, WorkflowExecutionListDto } from '@kbn/workflows';

interface SearchWorkflowExecutionsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowExecutionIndex: string;
  query: QueryDslQueryContainer;
  sort?: Sort;
}

export const searchWorkflowExecutions = async ({
  esClient,
  logger,
  workflowExecutionIndex,
  query,
  sort = [{ startedAt: 'desc' }],
}: SearchWorkflowExecutionsParams): Promise<WorkflowExecutionListDto> => {
  try {
    logger.info(`Searching workflow executions in index ${workflowExecutionIndex}`);
    const response = await esClient.search<EsWorkflowExecution>({
      index: workflowExecutionIndex,
      query,
      sort,
    });

    return transformToWorkflowExecutionListModel(response);
  } catch (error) {
    logger.error(`Failed to search workflow executions: ${error}`);
    throw error;
  }
};

function transformToWorkflowExecutionListModel(
  response: SearchResponse<EsWorkflowExecution>
): WorkflowExecutionListDto {
  return {
    results: response.hits.hits.map((hit) => {
      const workflowExecution = hit._source!;
      return {
        id: hit._id!,
        status: workflowExecution.status,
        startedAt: workflowExecution.startedAt,
        finishedAt: workflowExecution.finishedAt,
        duration: workflowExecution.duration,
        workflowId: workflowExecution.workflowId,
      };
    }),
    _pagination: {
      limit: response.hits.hits.length,
      offset: 0,
      total: response.hits.hits.length,
    },
  };
}
