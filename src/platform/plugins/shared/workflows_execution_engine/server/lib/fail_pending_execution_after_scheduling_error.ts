/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/** Releases a pending execution after scheduling fails without overwriting a concurrently started run. */
export const failPendingExecutionAfterSchedulingError = async ({
  workflowExecutionRepository,
  workflowRunId,
  spaceId,
  message,
}: {
  workflowExecutionRepository: Pick<
    WorkflowExecutionRepository,
    'getWorkflowExecutionWithVersion' | 'tryUpdateWorkflowExecutionWithVersion'
  >;
  workflowRunId: string;
  spaceId: string;
  message: string;
}): Promise<void> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await workflowExecutionRepository.getWorkflowExecutionWithVersion(
      workflowRunId,
      spaceId
    );
    if (!current || current.execution.status !== ExecutionStatus.PENDING) return;
    const { execution, seqNo, primaryTerm } = current;
    const updated = await workflowExecutionRepository.tryUpdateWorkflowExecutionWithVersion(
      {
        id: workflowRunId,
        status: execution.cancelRequested ? ExecutionStatus.CANCELLED : ExecutionStatus.FAILED,
        finishedAt: new Date().toISOString(),
        error: execution.cancelRequested
          ? execution.error
          : { type: 'WorkflowSchedulingError', message },
      },
      { seqNo, primaryTerm }
    );
    if (updated) return;
  }
  throw new Error(
    `Workflow execution ${workflowRunId} kept changing during scheduling-failure cleanup.`
  );
};
