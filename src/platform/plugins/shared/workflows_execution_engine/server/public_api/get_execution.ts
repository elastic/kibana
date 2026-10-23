/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { ExecutionReadDeps, GetExecutionParams, WorkflowExecutionRead } from './types';
import type { GetStepExecutionsByIdsOptions } from '../repositories/data_access_layer';
import { getStepExecutionsByWorkflowExecution } from '../repositories/data_access_layer/lib/get_step_executions_by_workflow_execution';

/** Caps the embedded step list so a large run does not exceed Kibana's response buffer. */
const EMBEDDED_STEPS_MAX_COUNT = 5000;

/**
 * Returns one workflow execution and its steps.
 * `spaceId` must match the document; a mismatch or a missing document returns `null`.
 * `includeInput` and `includeOutput` control step payloads. `omitSteps` returns an empty step list.
 * When the step payload exceeds the response limit, the execution is returned with no steps.
 */
export const getExecution = async (
  deps: ExecutionReadDeps,
  {
    executionId,
    spaceId,
    includeInput = false,
    includeOutput = false,
    omitSteps = false,
  }: GetExecutionParams
): Promise<WorkflowExecutionRead | null> => {
  try {
    const { items } = await deps.workflowExecutionsDataClient.getByIds([executionId]);
    const execution = items[0]?.document;
    if (!execution || execution.spaceId !== spaceId) {
      return null;
    }

    const sourceExcludes: string[] = [];
    if (!includeInput) sourceExcludes.push('input');
    if (!includeOutput) sourceExcludes.push('output');

    let steps: EsWorkflowStepExecution[] = [];
    if (!omitSteps) {
      try {
        steps = await getStepExecutionsByWorkflowExecution({
          stepExecutionsDataClient: deps.stepExecutionsDataClient,
          workflowExecutionId: executionId,
          stepExecutionIds: execution.stepExecutionIds,
          maxSteps: EMBEDDED_STEPS_MAX_COUNT,
          sourceExcludes: sourceExcludes as GetStepExecutionsByIdsOptions['sourceExcludes'],
        });
      } catch (error) {
        if (!isMaximumResponseSizeExceededError(error)) {
          throw error;
        }
        deps.logger.warn(
          `Failed to get workflow execution ${executionId} with steps: Elasticsearch response exceeded the maximum size Kibana can process`
        );
      }
    }

    return { execution, steps };
  } catch (error) {
    if (isMaximumResponseSizeExceededError(error)) {
      deps.logger.warn(
        `Workflow execution document ${executionId} exceeded the maximum response size Kibana can process`
      );
    } else {
      deps.logger.error(`Failed to get workflow execution ${executionId}: ${error}`);
    }
    throw error;
  }
};
