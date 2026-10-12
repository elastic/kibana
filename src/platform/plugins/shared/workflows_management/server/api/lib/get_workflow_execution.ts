/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowExecutionDto,
} from '@kbn/workflows';
import { pickWorkflowDocumentVersion } from '@kbn/workflows';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import { getExecution } from '@kbn/workflows-execution-engine/server';
import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';

interface GetWorkflowExecutionParams {
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  stepExecutionsDataClient: StepExecutionsDataClient;
  logger: Logger;
  workflowExecutionId: string;
  spaceId: string;
  includeInput?: boolean;
  includeOutput?: boolean;
  omitStepExecutions?: boolean;
}

export const getWorkflowExecution = async ({
  workflowExecutionsDataClient,
  stepExecutionsDataClient,
  logger,
  workflowExecutionId,
  spaceId,
  includeInput = false,
  includeOutput = false,
  omitStepExecutions = false,
}: GetWorkflowExecutionParams): Promise<WorkflowExecutionDto | null> => {
  const read = await getExecution(
    { logger, workflowExecutionsDataClient, stepExecutionsDataClient },
    {
      executionId: workflowExecutionId,
      spaceId,
      includeInput,
      includeOutput,
      omitSteps: omitStepExecutions,
    }
  );
  if (!read) {
    return null;
  }
  return transformToWorkflowExecutionDetailDto(
    workflowExecutionId,
    read.execution,
    read.steps,
    logger
  );
};

function transformToWorkflowExecutionDetailDto(
  id: string,
  workflowExecution: EsWorkflowExecution,
  stepExecutions: EsWorkflowStepExecution[],
  logger: Logger
): WorkflowExecutionDto {
  const { billable: _billable, ...workflowExecutionDtoFields } = workflowExecution;
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
    ...workflowExecutionDtoFields,
    id,
    isTestRun: workflowExecution.isTestRun ?? false,
    stepId: workflowExecution.stepId,
    stepExecutions,
    effectiveIdentity: workflowExecution.effectiveIdentity,
    executedBy: workflowExecution.executedBy ?? workflowExecution.createdBy,
    triggeredBy: workflowExecution.triggeredBy,
    yaml,
    traceId: workflowExecution.traceId,
    entryTransactionId: workflowExecution.entryTransactionId,
    concurrencyGroupKey: workflowExecution.concurrencyGroupKey,
    ...pickWorkflowDocumentVersion(workflowExecution),
  };
}
