/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  WorkflowExecutionDto,
} from '@kbn/workflows';
import { pickWorkflowDocumentVersion } from '@kbn/workflows';
import type {
  GetStepExecutionsByIdsOptions,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import { getStepExecutionsByWorkflowExecution } from '@kbn/workflows-execution-engine/server';
import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import { WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT } from '../../../common';

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
  try {
    // Use mget by id for O(1) lookup performance instead of search
    // This is critical for reducing ES CPU load from frequent UI polling
    const { items } = await workflowExecutionsDataClient.getByIds([workflowExecutionId]);
    const doc = items[0]?.document;

    // Verify spaceId matches for security/multi-tenancy
    if (!doc || doc.spaceId !== spaceId) {
      return null;
    }

    const sourceExcludes: string[] = [];
    if (!includeInput) sourceExcludes.push('input');
    if (!includeOutput) sourceExcludes.push('output');

    let stepExecutions: EsWorkflowStepExecution[] = [];
    if (!omitStepExecutions) {
      try {
        stepExecutions = await getStepExecutionsByWorkflowExecution({
          stepExecutionsDataClient,
          workflowExecutionId,
          stepExecutionIds: doc.stepExecutionIds?.slice(
            0,
            WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT
          ),
          sourceExcludes: sourceExcludes as GetStepExecutionsByIdsOptions['sourceExcludes'],
        });
      } catch (error) {
        if (!isMaximumResponseSizeExceededError(error)) {
          throw error;
        }
        logger.warn(
          `Failed to get workflow execution ${workflowExecutionId} with steps: Elasticsearch response exceeded the maximum size Kibana can process`
        );
      }
    }

    return transformToWorkflowExecutionDetailDto(workflowExecutionId, doc, stepExecutions, logger);
  } catch (error) {
    if (isMaximumResponseSizeExceededError(error)) {
      logger.warn(
        `Workflow execution document ${workflowExecutionId} exceeded the maximum response size Kibana can process`
      );
    } else {
      logger.error(`Failed to get workflow execution ${workflowExecutionId}: ${error}`);
    }
    throw error;
  }
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
    executedBy: workflowExecution.executedBy ?? workflowExecution.createdBy,
    triggeredBy: workflowExecution.triggeredBy,
    yaml,
    traceId: workflowExecution.traceId,
    entryTransactionId: workflowExecution.entryTransactionId,
    concurrencyGroupKey: workflowExecution.concurrencyGroupKey,
    ...pickWorkflowDocumentVersion(workflowExecution),
  };
}
