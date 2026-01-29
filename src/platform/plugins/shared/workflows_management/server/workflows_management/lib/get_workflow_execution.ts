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

    let effectiveStatus = workflowExecutionDoc.status;

    if (shouldReportAsRunning(workflowExecutionDoc, stepExecutions)) {
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

/**
 * Checks if step executions are incomplete due to ES refresh lag.
 * Returns true if any of these conditions are met:
 * - No steps found yet (workflow can't be without step executions)
 * - Not all step executions are indexed yet (count mismatch)
 * - Some steps are still non-terminal (searches from end for performance, as typically the last steps are still running)
 */
function shouldReportAsRunning(
  workflowExecution: EsWorkflowExecution,
  stepExecutions: EsWorkflowStepExecution[]
): boolean {
  if (
    !isTerminalStatus(workflowExecution.status) ||
    workflowExecution.stepExecutionsCount === undefined // backward compatibility for those not having the field
  ) {
    return false;
  }

  return (
    stepExecutions.length === 0 ||
    stepExecutions.length !== workflowExecution.stepExecutionsCount ||
    stepExecutions.findLast((stepExec) => !isTerminalStatus(stepExec.status)) !== undefined
  );
}

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
