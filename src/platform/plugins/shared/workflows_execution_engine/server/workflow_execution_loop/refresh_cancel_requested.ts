/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionLoopParams } from './types';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';

export const CANCEL_REFRESH_INTERVAL_MS = 500;

// Last refresh start time per execution, so the throttle outlives per-node monitors.
const lastRefreshByExecution = new WeakMap<WorkflowExecutionState, number>();

/**
 * Refreshes the in-memory `cancelRequested` flag from Elasticsearch in the background,
 * at most once per interval per execution. Never awaited by the caller and never throws,
 * so starting a node does not wait on the read. The next node picks up the flag.
 */
export const refreshCancelRequestedInBackground = (params: WorkflowExecutionLoopParams): void => {
  const { workflowExecutionState, workflowExecutionRepository, workflowLogger } = params;
  const now = Date.now();
  const last = lastRefreshByExecution.get(workflowExecutionState);
  if (last !== undefined && now - last < CANCEL_REFRESH_INTERVAL_MS) {
    return;
  }
  lastRefreshByExecution.set(workflowExecutionState, now);

  const { id, spaceId, cancelRequested } = workflowExecutionState.getWorkflowExecution();
  if (cancelRequested) {
    return;
  }

  void workflowExecutionRepository
    .getWorkflowExecutionById(id, spaceId)
    .then((currentExecution) => {
      if (currentExecution?.cancelRequested) {
        workflowExecutionState.updateWorkflowExecution({ cancelRequested: true });
      }
    })
    .catch((error) => {
      workflowLogger.logError(
        'Failed to check workflow cancellation status - continuing execution',
        error instanceof Error ? error : new Error(String(error))
      );
    });
};
