/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowExecutionDto,
} from '@kbn/workflows';
import { searchStepExecutions } from './search_step_executions';
import { stringifyWorkflowDefinition } from '../../../common/lib/yaml';

interface GetWorkflowExecutionParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowExecutionIndex: string;
  stepsExecutionIndex: string;
  workflowExecutionId: string;
  spaceId: string;
}

export const getWorkflowExecution = async ({
  esClient,
  logger,
  workflowExecutionIndex,
  stepsExecutionIndex,
  workflowExecutionId,
  spaceId,
}: GetWorkflowExecutionParams): Promise<WorkflowExecutionDto | null> => {
  try {
    const response = await esClient.search<EsWorkflowExecution>({
      index: workflowExecutionIndex,
      query: {
        bool: {
          must: [
            {
              ids: {
                values: [workflowExecutionId],
              },
            },
            { term: { spaceId } },
          ],
        },
      },
    });

    const hit = response.hits.hits[0] ?? null;

    if (!hit || !hit._source) {
      return null;
    }

    const stepExecutions = await searchStepExecutions({
      esClient,
      logger,
      stepsExecutionIndex,
      workflowExecutionId,
      spaceId,
    });

    return transformToWorkflowExecutionDetailDto(hit._id!, hit._source, stepExecutions, logger);
  } catch (error) {
    logger.error(`Failed to get workflow: ${error}`);
    throw error;
  }
};

function transformToWorkflowExecutionDetailDto(
  id: string,
  workflowExecution: EsWorkflowExecution,
  stepExecutions: EsWorkflowStepExecution[],
  logger: Logger
): WorkflowExecutionDto {
  let yaml = workflowExecution.yaml;
  // backward compatibility for workflow executions created before yaml was added to the workflow execution object
  try {
    if (!yaml) {
      yaml = stringifyWorkflowDefinition(workflowExecution.workflowDefinition);
    }
  } catch (error) {
    logger.error(`Failed to stringify workflow definition: ${error}`);
    yaml = '';
  }
  return {
    ...workflowExecution,
    id,
    stepId: workflowExecution.stepId,
    stepExecutions,
    triggeredBy: workflowExecution.triggeredBy, // <-- Include the triggeredBy field
    yaml,
  };
}
