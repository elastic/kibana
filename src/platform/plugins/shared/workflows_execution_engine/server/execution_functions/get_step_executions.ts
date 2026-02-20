/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { ExecutionStateRepository } from '../repositories/execution_state_repository/execution_state_repository';
import type { StepExecutionRepository } from '../repositories/step_execution_repository/step_execution_repository';
import type { GetStepExecutions } from '../types';

export function getStepExecutionsFn(
  executionStateRepository: ExecutionStateRepository,
  stepExecutionRepositoryPromise: Promise<StepExecutionRepository>
): GetStepExecutions {
  return async (executionId: string, spaceId: string) => {
    const executionsFromState = await executionStateRepository.getWorkflowExecutions(
      new Set([executionId]),
      spaceId
    );

    if (executionsFromState[executionId]) {
      return executionStateRepository.getStepExecutions(
        new Set(executionsFromState[executionId].stepExecutionIds ?? []),
        spaceId
      );
    }

    const stepExecutionRepository = await stepExecutionRepositoryPromise;
    const stepExecutions = await stepExecutionRepository.searchStepExecutionsByExecutionId(
      executionId
    );

    return stepExecutions.reduce((acc, stepExecution) => {
      acc[stepExecution.id] = stepExecution;
      return acc;
    }, {} as Record<string, EsWorkflowStepExecution>);
  };
}
