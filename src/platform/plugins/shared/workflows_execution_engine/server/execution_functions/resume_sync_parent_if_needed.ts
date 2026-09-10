/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { type EsWorkflowExecution, isSyncParentInvocation, isTerminalStatus } from '@kbn/workflows';
import type { InternalResumeWorkflowExecution } from '../types';

/**
 * Wakes a workflow that is waiting on a synchronous child once that child reaches a terminal
 * status, always under the parent's own execution identity.
 */
export async function resumeSyncParentIfNeeded({
  childExecution,
  spaceId,
  internalResumeWorkflowExecution,
  logger,
}: {
  childExecution: EsWorkflowExecution;
  spaceId: string;
  internalResumeWorkflowExecution?: InternalResumeWorkflowExecution;
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
    // Invariant: a sync parent must never resume under an identity derived from its child.
    // Resuming without a request makes internalResumeWorkflowExecution wake the parent's own
    // pre-scheduled resume task, which was cloned from the parent's request when the parent
    // entered WAITING_FOR_CHILD. Passing the child's request here instead would delete that
    // task and reschedule from the child's identity — after a child HITL approval the child
    // runs as the approver, so the parent would adopt the approver's identity for the rest of
    // its run.
    await internalResumeWorkflowExecution(parentExecId, spaceId, undefined);
    logger.info(
      `Child ${childExecution.id} completed (${childExecution.status}), scheduled resume for parent ${parentExecId}`
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // Deliberately no fallback that schedules a resume from this run's request: that request
    // belongs to the child, and using it would reintroduce the identity leak on the error path.
    // The parent's own pre-scheduled resume task is left untouched by the call above, so a
    // transient failure here still resolves when that task fires at its idle timeout.
    logger.error(
      `Failed to resume parent under its own identity after child completion (parent=${parentExecId}, child=${childExecution.id}): ${reason}. ` +
        `The parent will resume when its pre-scheduled resume task fires; it will remain in WAITING_FOR_CHILD if that task no longer exists.`
    );
  }
}
