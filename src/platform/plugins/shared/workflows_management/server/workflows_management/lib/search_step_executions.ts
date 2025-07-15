/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { WorkflowStepExecution } from '@kbn/workflows';

interface SearchStepExectionsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  stepsExecutionIndex: string;
  workflowExecutionId: string;
}

export const searchStepExecutions = async ({
  esClient,
  logger,
  stepsExecutionIndex,
  workflowExecutionId,
}: SearchStepExectionsParams): Promise<WorkflowStepExecution[]> => {
  try {
    logger.info(`Searching workflows in index ${stepsExecutionIndex}`);
    const response = await esClient.search<WorkflowStepExecution>({
      index: stepsExecutionIndex,
      query: { match: { workflowRunId: workflowExecutionId } },
    });

    logger.info(
      `Found ${response.hits.hits.length} workflows, ${response.hits.hits.map((hit) => hit._id)}`
    );

    return response.hits.hits.map((hit) => hit._source as WorkflowStepExecution);
  } catch (error) {
    logger.error(`Failed to search workflows: ${error}`);
    throw error;
  }
};
