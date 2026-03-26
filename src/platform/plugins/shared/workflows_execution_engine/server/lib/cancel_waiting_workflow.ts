/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/**
 * Directly cancels a workflow that is in WAITING_FOR_INPUT status.
 *
 * Unlike RUNNING workflows (where we set cancelRequested and let the
 * execution loop handle it), WAITING_FOR_INPUT workflows have no active
 * task — so we must transition both the workflow *and* its paused step
 * executions to CANCELLED immediately.
 */
export const cancelWaitingWorkflow = async ({
  workflowExecution,
  workflowExecutionRepository,
  stepExecutionRepository,
}: {
  workflowExecution: EsWorkflowExecution;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
}): Promise<void> => {
  if (workflowExecution.stepExecutionIds?.length) {
    const steps = await stepExecutionRepository.getStepExecutionsByIds(
      workflowExecution.stepExecutionIds
    );
    const waitingSteps = steps.filter((s) => s.status === ExecutionStatus.WAITING_FOR_INPUT);
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
