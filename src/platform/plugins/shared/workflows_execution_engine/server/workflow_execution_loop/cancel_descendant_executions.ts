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
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

/**
 * Statuses where no active execution loop is running, so the status can
 * safely be set to CANCELLED immediately without waiting for the monitoring loop.
 */
const IDLE_STATUSES: readonly ExecutionStatus[] = [
  ExecutionStatus.WAITING,
  ExecutionStatus.WAITING_FOR_INPUT,
  ExecutionStatus.PENDING,
];

/**
 * Recursively cancels all descendant workflow executions (children, grandchildren, etc.)
 * using iterative BFS to avoid unbounded call-stack depth.
 *
 * For each level it:
 * 1. Queries for non-terminal child executions of the current parent IDs
 * 2. Bulk-updates them with `cancelRequested: true` (and `status: CANCELLED` for
 *    idle executions that have no running monitoring loop)
 * 3. Forces their idle tasks to run so the monitoring loop picks up the flag
 *
 * The operation is idempotent — already-cancelled descendants are simply skipped
 * by the non-terminal status filter in the repository query.
 */
export async function cancelDescendantExecutions(
  parentExecutionId: string,
  spaceId: string,
  workflowExecutionRepository: WorkflowExecutionRepository,
  workflowTaskManager: WorkflowTaskManager,
  cancellationReason: string = 'Cancelled due to parent workflow cancellation'
): Promise<void> {
  const cancellationTimestamp = new Date().toISOString();
  let currentParentIds = [parentExecutionId];

  while (currentParentIds.length > 0) {
    const childBatches = await Promise.all(
      currentParentIds.map((parentId) =>
        workflowExecutionRepository.getNonTerminalChildExecutions(parentId, spaceId)
      )
    );

    const allChildren = childBatches.flat();
    if (allChildren.length === 0) {
      break;
    }

    await workflowExecutionRepository.bulkUpdateWorkflowExecutions(
      allChildren.map(({ id, status }) => ({
        id,
        cancelRequested: true,
        cancellationReason,
        cancelledAt: cancellationTimestamp,
        cancelledBy: 'system',
        ...(IDLE_STATUSES.includes(status)
          ? { status: ExecutionStatus.CANCELLED, finishedAt: cancellationTimestamp }
          : {}),
      }))
    );

    const allChildIds = allChildren.map(({ id }) => id);
    await Promise.all(allChildIds.map((id) => workflowTaskManager.forceRunIdleTasks(id)));

    currentParentIds = allChildIds;
  }
}
