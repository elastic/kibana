/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { type EsWorkflowExecution, isSyncParentInvocation, isTerminalStatus } from '@kbn/workflows';
import type { InternalResumeWorkflowExecution } from '../types';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

export async function resumeSyncParentIfNeeded({
  childExecution,
  spaceId,
  fakeRequest,
  internalResumeWorkflowExecution,
  workflowTaskManager,
  logger,
}: {
  childExecution: EsWorkflowExecution;
  spaceId: string;
  fakeRequest: KibanaRequest;
  internalResumeWorkflowExecution?: InternalResumeWorkflowExecution;
  workflowTaskManager?: WorkflowTaskManager;
  logger: Logger;
}): Promise<void> {
  if (
    !internalResumeWorkflowExecution ||
    !isTerminalStatus(childExecution.status) ||
    !isSyncParentInvocation(childExecution.context)
  ) {
    return;
  }

  const parentExecId = childExecution.context.parentWorkflowExecutionId;
  try {
    await internalResumeWorkflowExecution(parentExecId, spaceId, undefined, fakeRequest);
    logger.info(
      `Child ${childExecution.id} completed (${childExecution.status}), scheduled resume for parent ${parentExecId}`
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn(
      `Failed to resume parent after child completion (parent=${parentExecId}, child=${childExecution.id}): ${reason}`
    );
    if (!workflowTaskManager) {
      return;
    }

    try {
      await workflowTaskManager.scheduleAndRunImmediateResume({
        executionId: parentExecId,
        spaceId,
        fakeRequest,
      });
      logger.info(
        `Scheduled immediate Task Manager resume as fallback for parent ${parentExecId} after inline resume failure`
      );
    } catch (scheduleErr) {
      const scheduleReason =
        scheduleErr instanceof Error ? scheduleErr.message : String(scheduleErr);
      logger.warn(
        `Fallback scheduleAndRunImmediateResume also failed (parent=${parentExecId}): ${scheduleReason}`
      );
    }
  }
}
