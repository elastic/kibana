/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowExecutionDto,
} from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
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
    // Use direct GET by _id for O(1) lookup performance instead of search
    // This is critical for reducing ES CPU load from frequent UI polling
    let response;
    try {
      response = await esClient.get<EsWorkflowExecution>({
        index: workflowExecutionIndex,
        id: workflowExecutionId,
      });
    } catch (error: unknown) {
      // Handle 404 - document not found
      if (
        error instanceof Error &&
        'meta' in error &&
        (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
      ) {
        return null;
      }
      throw error;
    }

    const workflowExecutionDoc = response._source;

    // Verify spaceId matches for security/multi-tenancy
    if (!workflowExecutionDoc || workflowExecutionDoc.spaceId !== spaceId) {
      return null;
    }

    const stepExecutions = await searchStepExecutions({
      esClient,
      logger,
      stepsExecutionIndex,
      workflowExecutionId,
      spaceId,
    });

    // Handle race condition: workflow in terminal status but steps not yet visible or still non-terminal
    // This can happen due to ES refresh lag (refresh: false on writes, 1-second default refresh interval)
    // Instead of forcing expensive refresh, temporarily report workflow as RUNNING to keep the client polling
    // until ES naturally refreshes and step statuses become consistent
    let effectiveStatus = workflowExecutionDoc.status;
    const hasIncompleteSteps =
      stepExecutions.length === 0 ||
      stepExecutions.some((stepExec) => !isTerminalStatus(stepExec.status));

    if (isTerminalStatus(workflowExecutionDoc.status) && hasIncompleteSteps) {
      effectiveStatus = ExecutionStatus.RUNNING;
    }

    return transformToWorkflowExecutionDetailDto(
      workflowExecutionId,
      { ...workflowExecutionDoc, status: effectiveStatus },
      stepExecutions,
      logger
    );
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
    isTestRun: workflowExecution.isTestRun ?? false,
    stepId: workflowExecution.stepId,
    stepExecutions,
    triggeredBy: workflowExecution.triggeredBy, // <-- Include the triggeredBy field
    yaml,
    traceId: workflowExecution.traceId,
    entryTransactionId: workflowExecution.entryTransactionId,
  };
}
