/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import type { ExecutionStateRepository } from '../execution_state_repository/execution_state_repository';
import type { WorkflowExecutionRepository } from '../workflow_execution_repository/workflow_execution_repository';

export function getWorkflowExecutionFn(
  executionStateRepository: ExecutionStateRepository,
  workflowExecutionRepositoryPromise: Promise<WorkflowExecutionRepository>
) {
  /**
   * Retrieves a workflow execution by ID, checking hot storage first and falling back to cold storage.
   *
   * When `fields` is provided, only those properties are fetched from hot storage
   * and the return type is narrowed to `Pick<EsWorkflowExecution, K>`.
   * The cold storage fallback always returns full documents.
   */
  async function getWorkflowExecution(
    executionId: string,
    spaceId: string
  ): Promise<EsWorkflowExecution | null>;
  async function getWorkflowExecution<K extends keyof EsWorkflowExecution>(
    executionId: string,
    spaceId: string,
    fields: K[]
  ): Promise<Pick<EsWorkflowExecution, K> | null>;
  async function getWorkflowExecution<K extends keyof EsWorkflowExecution>(
    executionId: string,
    spaceId: string,
    fields?: K[]
  ): Promise<EsWorkflowExecution | Pick<EsWorkflowExecution, K> | null> {
    const executionsFromState = fields
      ? await executionStateRepository.getWorkflowExecutions(
          new Set([executionId]),
          spaceId,
          fields
        )
      : await executionStateRepository.getWorkflowExecutions(new Set([executionId]), spaceId);

    if (executionsFromState[executionId]) {
      return executionsFromState[executionId];
    }

    const workflowExecutionRepository = await workflowExecutionRepositoryPromise;
    const executionFromRepository = fields
      ? await workflowExecutionRepository.getWorkflowExecutionById(executionId, spaceId, fields)
      : await workflowExecutionRepository.getWorkflowExecutionById(executionId, spaceId);

    if (executionFromRepository) {
      return executionFromRepository;
    }

    return null;
  }

  return getWorkflowExecution;
}
