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

export function getStepExecutionFn(
  executionStateRepository: ExecutionStateRepository,
  stepExecutionRepositoryPromise: Promise<StepExecutionRepository>
) {
  async function getStepExecution(
    stepExecutionId: string,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null>;
  async function getStepExecution<K extends keyof EsWorkflowStepExecution>(
    stepExecutionId: string,
    spaceId: string,
    fields: K[]
  ): Promise<Pick<EsWorkflowStepExecution, K> | null>;
  async function getStepExecution<K extends keyof EsWorkflowStepExecution>(
    stepExecutionId: string,
    spaceId: string,
    fields?: K[]
  ): Promise<EsWorkflowStepExecution | Pick<EsWorkflowStepExecution, K> | null> {
    const result = fields
      ? await executionStateRepository.getStepExecutions(
          new Set([stepExecutionId]),
          spaceId,
          fields
        )
      : await executionStateRepository.getStepExecutions(new Set([stepExecutionId]), spaceId);

    const fromState = result[stepExecutionId];
    if (fromState) {
      return fromState;
    }

    const stepExecutionRepository = await stepExecutionRepositoryPromise;
    return fields
      ? stepExecutionRepository.searchStepExecutionById(stepExecutionId, spaceId, fields)
      : stepExecutionRepository.searchStepExecutionById(stepExecutionId, spaceId);
  }

  return getStepExecution;
}
