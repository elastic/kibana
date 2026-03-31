/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { isSyncParentInvocation, isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

export async function tryWakeParentResumeTaskAfterSyncChildCompletion({
  childWorkflowRunId,
  finalExecution,
  spaceId,
  workflowExecutionRepository,
  workflowTaskManager,
  logger,
}: {
  childWorkflowRunId: string;
  finalExecution: EsWorkflowExecution | null;
  spaceId: string;
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowTaskManager: WorkflowTaskManager;
  logger: Logger;
}): Promise<void> {
  if (!finalExecution || !isTerminalStatus(finalExecution.status)) {
    return;
  }

  if (!isSyncParentInvocation(finalExecution.context)) {
    return;
  }

  const parentExecId = finalExecution.context.parentWorkflowExecutionId;
  logger.info(
    `Child ${childWorkflowRunId} completed (status=${finalExecution.status}), waking parent ${parentExecId}`
  );

  try {
    const parentExecution = await workflowExecutionRepository.getWorkflowExecutionById(
      parentExecId,
      spaceId
    );
    if (parentExecution?.pendingResumeTaskId) {
      await workflowTaskManager.runTaskSoon(parentExecution.pendingResumeTaskId);
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn(
      `Failed to wake parent resume task (parent=${parentExecId}, child=${childWorkflowRunId}): ${reason}`
    );
  }
}
