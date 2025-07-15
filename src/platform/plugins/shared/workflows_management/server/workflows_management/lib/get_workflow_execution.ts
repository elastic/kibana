/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { WorkflowExecutionEngineModel } from '@kbn/workflows/types/v1';

interface GetWorkflowExecutionParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowExecutionIndex: string;
  workflowExecutionId: string;
}

export const getWorkflowExecution = async ({
  esClient,
  logger,
  workflowExecutionIndex,
  workflowExecutionId,
}: GetWorkflowExecutionParams): Promise<WorkflowExecutionEngineModel | null> => {
  try {
    const response = await esClient.search<WorkflowExecutionEngineModel>({
      index: workflowExecutionIndex,
      query: {
        match: {
          _id: workflowExecutionId,
        },
      },
    });

    return response.hits.hits.map((hit) => hit._source)[0] ?? null;
  } catch (error) {
    logger.error(`Failed to get workflow: ${error}`);
    throw error;
  }
};
