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
import { WorkflowExecutionListModel, WorkflowExecutionModel } from '@kbn/workflows';

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
}: SearchWorkflowExecutionsParams): Promise<WorkflowExecutionListModel> => {
  try {
    logger.info(`Searching workflows in index ${workflowExecutionIndex}`);
    const response = await esClient.search<WorkflowExecutionModel>({
      index: workflowExecutionIndex,
      query,
      sort,
    });

    return transformToWorkflowExecutionListModel(response);
  } catch (error) {
    logger.error(`Failed to search workflows: ${error}`);
    throw error;
  }
};

function transformToWorkflowExecutionListModel(response: SearchResponse<WorkflowExecutionModel>) {
  return {
    results: response.hits.hits.map((hit) => hit._source as WorkflowExecutionModel),
    _pagination: {
      limit: response.hits.hits.length,
      offset: 0,
      total: response.hits.hits.length,
    },
  };
}
