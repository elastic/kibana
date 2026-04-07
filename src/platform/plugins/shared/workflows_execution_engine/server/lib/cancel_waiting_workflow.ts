/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus, isExecuteSyncStepType } from '@kbn/workflows';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/**
 * Cancels a workflow in WAITING_FOR_INPUT or WAITING_FOR_CHILD.
 *
 * The execution loop is not active, so persist CANCELLED on the workflow and waiting steps here
 * instead of relying on onCancel. For WAITING_FOR_CHILD, also cancels the nested child execution.
 */
export const cancelWaitingWorkflow = async ({
  workflowExecution,
  workflowExecutionRepository,
  stepExecutionRepository,
  cancelChildExecution,
}: {
  workflowExecution: EsWorkflowExecution;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
  cancelChildExecution?: (executionId: string, spaceId: string) => Promise<void>;
}): Promise<void> => {
  if (workflowExecution.stepExecutionIds?.length) {
    const steps = await stepExecutionRepository.getStepExecutionsByIds(
      workflowExecution.stepExecutionIds
    );
    const waitingSteps = steps.filter(
      (s) =>
        s.status === ExecutionStatus.WAITING_FOR_INPUT ||
        s.status === ExecutionStatus.WAITING_FOR_CHILD
    );

    if (cancelChildExecution) {
      for (const step of waitingSteps) {
        const childExecId = step.state?.executionId;
        if (isExecuteSyncStepType(step.stepType) && typeof childExecId === 'string') {
          try {
            await cancelChildExecution(childExecId, workflowExecution.spaceId);
          } catch {
            // Best effort — child may already be terminal
          }
        }
      }
    }

    if (waitingSteps.length > 0) {
      await stepExecutionRepository.bulkUpsert(
        waitingSteps.map((s) => ({ id: s.id, status: ExecutionStatus.CANCELLED }))
      );
    }
  }

  const cancelledAt = new Date().toISOString();
  await workflowExecutionRepository.updateWorkflowExecution({
    id: workflowExecution.id,
    status: ExecutionStatus.CANCELLED,
    cancelRequested: true,
    cancellationReason: 'Cancelled by user',
    cancelledAt,
    cancelledBy: 'system',
  });
};
