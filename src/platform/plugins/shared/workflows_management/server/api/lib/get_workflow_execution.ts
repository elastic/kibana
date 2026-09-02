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

/** Max step documents loaded in one `_mget` for execution detail. */
const STEP_EXECUTIONS_MAX_COUNT = 100;

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
          stepExecutionIds: doc.stepExecutionIds?.slice(0, STEP_EXECUTIONS_MAX_COUNT),
          sourceExcludes: sourceExcludes as GetStepExecutionsByIdsOptions['sourceExcludes'],
        });
      } catch (error) {
        if (!isMaximumResponseSizeExceededError(error)) {
          throw error;
        }
        logger.warn(
          `Failed to get workflow execution with steps: Elasticsearch response exceeded the maximum size Kibana can process`
        );
      }
    }

    const truncatedCount = omitStepExecutions
      ? 0
      : (doc.stepExecutionIds?.length ?? 0) - stepExecutions.length;

    return transformToWorkflowExecutionDetailDto(
      workflowExecutionId,
      doc,
      stepExecutions,
      logger,
      truncatedCount > 0 ? truncatedCount : undefined
    );
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
  logger: Logger,
  stepExecutionsTruncatedCount?: number
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
    ...(stepExecutionsTruncatedCount !== undefined ? { stepExecutionsTruncatedCount } : {}),
    executedBy: workflowExecution.executedBy ?? workflowExecution.createdBy,
    triggeredBy: workflowExecution.triggeredBy,
    yaml,
    traceId: workflowExecution.traceId,
    entryTransactionId: workflowExecution.entryTransactionId,
    concurrencyGroupKey: workflowExecution.concurrencyGroupKey,
    ...pickWorkflowDocumentVersion(workflowExecution),
  };
}
