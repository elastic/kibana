/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import {
  type EsWorkflowExecution,
  ExecutionStatus,
  isSyncParentInvocation,
  isTerminalStatus,
} from '@kbn/workflows';
import { markExecutionFailedTaskRecovery, TASK_RECOVERY_ERROR_TYPE } from '../lib/task_recovery';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { InternalResumeWorkflowExecution } from '../types';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

/** Covers the ~1s window while the parent arms its resume task after starting the child. */
const PARENT_WAKE_ATTEMPTS = 8;
const PARENT_WAKE_RETRY_DELAY_MS = 250;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Wakes a sync parent after its child reaches a terminal status, always under the
 * parent's own pre-scheduled resume task. Never forwards the child's request:
 * after a child HITL approval that request is the approver's, and using it would
 * make the parent resume as the approver.
 *
 * If the parent's task does not exist yet (child finished during arming), retries
 * briefly so the parent-side handshake can land. If wake-up is still impossible,
 * fail-closes the parent rather than leaving it in WAITING_FOR_CHILD.
 */
export async function resumeSyncParentIfNeeded({
  childExecution,
  spaceId,
  internalResumeWorkflowExecution,
  workflowExecutionRepository,
  stepExecutionRepository,
  workflowTaskManager,
  logger,
}: {
  childExecution: EsWorkflowExecution;
  spaceId: string;
  internalResumeWorkflowExecution?: InternalResumeWorkflowExecution;
  workflowExecutionRepository?: WorkflowExecutionRepository;
  stepExecutionRepository?: StepExecutionRepository;
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

  for (let attempt = 1; attempt <= PARENT_WAKE_ATTEMPTS; attempt++) {
    try {
      // Invariant: a sync parent must never resume under an identity derived from its child.
      // Resuming without a request makes internalResumeWorkflowExecution wake the parent's own
      // pre-scheduled resume task (cloned from the parent's request when it entered
      // WAITING_FOR_CHILD). Passing the child's request here instead would delete that task
      // and reschedule from the child's identity.
      await internalResumeWorkflowExecution(parentExecId, spaceId, undefined);
      logger.info(
        `Child ${childExecution.id} completed (${childExecution.status}), scheduled resume for parent ${parentExecId}`
      );
      return;
    } catch (err) {
      const reason = errorMessage(err);
      if (attempt < PARENT_WAKE_ATTEMPTS) {
        logger.debug(
          `Failed to resume parent under its own identity after child completion ` +
            `(parent=${parentExecId}, child=${childExecution.id}, attempt=${attempt}/${PARENT_WAKE_ATTEMPTS}): ${reason}. Retrying.`
        );
        await delay(PARENT_WAKE_RETRY_DELAY_MS);
      } else {
        logger.error(
          `Failed to resume parent under its own identity after child completion ` +
            `(parent=${parentExecId}, child=${childExecution.id}): ${reason}.`
        );
      }
    }
  }

  await failClosedIfParentStillWaiting({
    parentExecId,
    childExecutionId: childExecution.id,
    spaceId,
    workflowExecutionRepository,
    stepExecutionRepository,
    workflowTaskManager,
    logger,
  });
}

async function failClosedIfParentStillWaiting({
  parentExecId,
  childExecutionId,
  spaceId,
  workflowExecutionRepository,
  stepExecutionRepository,
  workflowTaskManager,
  logger,
}: {
  parentExecId: string;
  childExecutionId: string;
  spaceId: string;
  workflowExecutionRepository?: WorkflowExecutionRepository;
  stepExecutionRepository?: StepExecutionRepository;
  workflowTaskManager?: WorkflowTaskManager;
  logger: Logger;
}): Promise<void> {
  if (!workflowExecutionRepository) {
    logger.error(
      `Cannot fail-close parent ${parentExecId} after child ${childExecutionId} completion: ` +
        `workflow execution repository is unavailable. The parent may remain in WAITING_FOR_CHILD.`
    );
    return;
  }

  try {
    const parent = await workflowExecutionRepository.getWorkflowExecutionById(
      parentExecId,
      spaceId
    );
    if (!parent || isTerminalStatus(parent.status) || parent.status === ExecutionStatus.RUNNING) {
      return;
    }

    if (parent.status !== ExecutionStatus.WAITING_FOR_CHILD) {
      return;
    }

    if (
      workflowTaskManager &&
      (await workflowTaskManager.hasActiveTaskForExecution(parentExecId))
    ) {
      try {
        await workflowTaskManager.runExistingResumeTask(parentExecId);
        logger.info(
          `Woke existing authenticated resume task for parent ${parentExecId} after child ${childExecutionId} completion`
        );
      } catch (wakeErr) {
        logger.warn(
          `Parent ${parentExecId} is still WAITING_FOR_CHILD after child ${childExecutionId} completion; ` +
            `an authenticated resume task exists but runSoon failed (${errorMessage(
              wakeErr
            )}). Leaving it to fire.`
        );
      }
      return;
    }

    if (!stepExecutionRepository) {
      logger.error(
        `Cannot fail-close parent ${parentExecId} after child ${childExecutionId} completion: ` +
          `step execution repository is unavailable. The parent may remain in WAITING_FOR_CHILD.`
      );
      return;
    }

    const message =
      `Failed to resume parent workflow ${parentExecId} under its own identity after child ` +
      `${childExecutionId} completed. The parent had no authenticated resume task to wake.`;
    await markExecutionFailedTaskRecovery(
      workflowExecutionRepository,
      stepExecutionRepository,
      parentExecId,
      { type: TASK_RECOVERY_ERROR_TYPE, message }
    );
    logger.error(`Marked parent workflow ${parentExecId} FAILED: ${message}`);
  } catch (failErr) {
    logger.error(
      `Failed to fail-close parent ${parentExecId} after child ${childExecutionId} completion: ${errorMessage(
        failErr
      )}`
    );
  }
}
