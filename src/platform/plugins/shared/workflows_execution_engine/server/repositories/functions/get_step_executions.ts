/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { ExecutionStateRepository } from '../execution_state_repository/execution_state_repository';
import type { StepExecutionRepository } from '../step_execution_repository/step_execution_repository';

export function getStepExecutionsFn(
  executionStateRepository: ExecutionStateRepository,
  stepExecutionRepositoryPromise: Promise<StepExecutionRepository>
) {
  async function getStepExecutions(
    executionId: string,
    spaceId: string
  ): Promise<EsWorkflowStepExecution[] | null>;
  async function getStepExecutions<K extends keyof EsWorkflowStepExecution>(
    executionId: string,
    spaceId: string,
    fields: K[]
  ): Promise<Pick<EsWorkflowStepExecution, K>[] | null>;
  async function getStepExecutions<K extends keyof EsWorkflowStepExecution>(
    executionId: string,
    spaceId: string,
    fields?: K[]
  ): Promise<EsWorkflowStepExecution | Pick<EsWorkflowStepExecution, K>[] | null> {
    const executionsFromState = await executionStateRepository.getWorkflowExecutions(
      new Set([executionId]),
      spaceId
    );

    if (executionsFromState[executionId]) {
      const stepIds = new Set(executionsFromState[executionId].stepExecutionIds ?? []);
      const result = fields
        ? await executionStateRepository.getStepExecutions(stepIds, spaceId, fields)
        : await executionStateRepository.getStepExecutions(stepIds, spaceId);
      return Object.values(result);
    }

    const stepExecutionRepository = await stepExecutionRepositoryPromise;
    const result = fields
      ? await stepExecutionRepository.searchStepExecutionsByExecutionId(executionId, fields)
      : await stepExecutionRepository.searchStepExecutionsByExecutionId(executionId);
    return result;
  }

  return getStepExecutions;
}
