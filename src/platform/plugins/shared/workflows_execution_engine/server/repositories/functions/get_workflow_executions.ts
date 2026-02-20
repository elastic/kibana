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
import type { GetWorkflowExecution } from '../../types';

export function getWorkflowExecutionFn(
  executionStateRepository: ExecutionStateRepository,
  workflowExecutionRepositoryPromise: Promise<WorkflowExecutionRepository>
): GetWorkflowExecution {
  return async (executionId: string, spaceId: string) => {
    const executionsFromState = await executionStateRepository.getWorkflowExecutions(
      new Set([executionId]),
      spaceId
    );

    if (executionsFromState[executionId]) {
      return executionsFromState[executionId] as EsWorkflowExecution;
    }

    const workflowExecutionRepository = await workflowExecutionRepositoryPromise;
    const executionFromRepository = await workflowExecutionRepository.getWorkflowExecutionById(
      executionId,
      spaceId
    );

    if (executionFromRepository) {
      return executionFromRepository;
    }

    return null;
  };
}
