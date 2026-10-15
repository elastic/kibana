/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EsWorkflowExecution, ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/** Finalizes an identity failure without overwriting a concurrent cancellation or terminal result. */
export const finalizeWorkflowIdentityFailure = async ({
  workflowRunId,
  spaceId,
  error,
  workflowExecutionRepository,
  stepExecutionRepository,
}: {
  workflowRunId: string;
  spaceId: string;
  error: { type: string; message: string };
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
}): Promise<EsWorkflowExecution | null> => {
  const cancelSteps = async (execution: EsWorkflowExecution): Promise<void> => {
    const steps = await stepExecutionRepository.getStepExecutionsByWorkflowExecution(
      execution.id,
      execution.stepExecutionIds
    );
    const finishedAt = new Date().toISOString();
    await stepExecutionRepository.bulkUpsert(
      steps
        .filter(
          (step) =>
            !isTerminalStatus(step.status) ||
            // A stale identity-failure write may have landed after cancellation won.
            (step.status === ExecutionStatus.FAILED && step.error?.type === error.type)
        )
        .map((step) => ({
          id: step.id,
          status: ExecutionStatus.CANCELLED,
          error: {
            type: 'WorkflowCancelled',
            message: execution.cancellationReason ?? 'Workflow cancelled.',
          },
          finishedAt,
        }))
    );
  };

  // Read once more after the last conflict so a winning cancellation repairs stale step writes.
  for (let attempt = 0; attempt <= 3; attempt++) {
    const current = await workflowExecutionRepository.getWorkflowExecutionWithVersion(
      workflowRunId,
      spaceId
    );
    if (!current) return null;
    const { execution, seqNo, primaryTerm } = current;
    if (isTerminalStatus(execution.status)) {
      if (execution.status === ExecutionStatus.CANCELLED) await cancelSteps(execution);
      return null;
    }
    if (execution.cancelRequested) await cancelSteps(execution);
    if (attempt === 3) break;
    const terminalExecution: EsWorkflowExecution = {
      ...execution,
      status: execution.cancelRequested ? ExecutionStatus.CANCELLED : ExecutionStatus.FAILED,
      finishedAt: new Date().toISOString(),
      error: execution.cancelRequested ? execution.error : error,
      context: { ...execution.context, serviceAccountFailureCleanupPending: true },
    };
    // Complete step cleanup before publishing the status that stops UI polling.
    if (!execution.cancelRequested) {
      await stepExecutionRepository.markNonTerminalStepsFailed(
        execution.id,
        error,
        execution.stepExecutionIds
      );
    }
    const updated = await workflowExecutionRepository.tryUpdateWorkflowExecutionWithVersion(
      {
        id: execution.id,
        status: terminalExecution.status,
        finishedAt: terminalExecution.finishedAt,
        error: terminalExecution.error,
        context: terminalExecution.context,
      },
      { seqNo, primaryTerm }
    );
    if (updated) return terminalExecution;
  }
  throw new Error(
    `Workflow execution ${workflowRunId} kept changing during identity-failure cleanup.`
  );
};
