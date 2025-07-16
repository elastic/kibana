/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EsWorkflowExecution, EsWorkflowStepExecution, WorkflowExecutionDto } from '@kbn/workflows';
import { searchStepExecutions } from './search_step_executions';

interface GetWorkflowExecutionParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowExecutionIndex: string;
  stepsExecutionIndex: string;
  workflowExecutionId: string;
}

export const getWorkflowExecution = async ({
  esClient,
  logger,
  workflowExecutionIndex,
  stepsExecutionIndex,
  workflowExecutionId,
}: GetWorkflowExecutionParams): Promise<WorkflowExecutionDto | null> => {
  try {
    const response = await esClient.search<EsWorkflowExecution>({
      index: workflowExecutionIndex,
      query: {
        match: {
          _id: workflowExecutionId,
        },
      },
    });

    const workflowExecution = response.hits.hits.map((hit) => hit._source)[0] ?? null;

    if (!workflowExecution) {
      return null;
    }

    const stepExecutions = await searchStepExecutions({
      esClient,
      logger,
      stepsExecutionIndex,
      workflowExecutionId,
    });

    return transformToWorkflowExecutionDetailDto(workflowExecution, stepExecutions);
  } catch (error) {
    logger.error(`Failed to get workflow: ${error}`);
    throw error;
  }
};

function transformToWorkflowExecutionDetailDto(
  workflowExecution: EsWorkflowExecution,
  stepExecutions: EsWorkflowStepExecution[]
): WorkflowExecutionDto {
  return {
    ...workflowExecution,
    stepExecutions,
  };
}
