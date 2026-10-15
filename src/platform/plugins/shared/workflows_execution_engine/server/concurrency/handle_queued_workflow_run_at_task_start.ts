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
import { ExecutionStatus } from '@kbn/workflows';

import { getQueueWaitDeadlineMs, resolveQueueTtlSetting } from './queue_concurrency_utils';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

export const QUEUE_RUN_INVARIANT_ERROR_TYPE = 'QueueRunInvariantError' as const;

/**
 * Handles `workflow:run` when the execution is still `queued` at task start.
 * Returns true when the run was fully handled (terminal) and the caller should return early.
 * The caller must return `{ shouldDeleteTask: true }` to Task Manager — do not remove the task
 * mid-run via `removeIfExists` (that causes TM 404 errors on completion).
 */
export async function handleQueuedWorkflowRunAtTaskStart({
  execution,
  workflowRunId,
  workflowExecutionRepository,
  logger,
}: {
  execution: EsWorkflowExecution;
  workflowRunId: string;
  workflowExecutionRepository: WorkflowExecutionRepository;
  logger: Logger;
}): Promise<boolean> {
  if (execution.status !== ExecutionStatus.QUEUED) {
    return false;
  }

  const concurrency = execution.workflowDefinition?.settings?.concurrency;
  const ttlSetting = resolveQueueTtlSetting(concurrency);
  const deadlineMs = getQueueWaitDeadlineMs(execution, concurrency);
  const nowMs = Date.now();

  if (nowMs >= deadlineMs) {
    const cancelledAt = new Date().toISOString();
    await workflowExecutionRepository.updateWorkflowExecution({
      id: workflowRunId,
      status: ExecutionStatus.SKIPPED,
      cancelRequested: true,
      cancellationReason: `Queue wait exceeded (queue-ttl: ${ttlSetting})`,
      cancelledAt,
      cancelledBy: 'system',
    });
    logger.debug(
      `Workflow execution ${workflowRunId} skipped: queue wait exceeded (queue-ttl: ${ttlSetting})`
    );
    return true;
  }

  const finishedAt = new Date().toISOString();
  const message =
    'Queue run task started before the execution was promoted from queued to pending; no recovery path exists for this state';
  await workflowExecutionRepository.updateWorkflowExecution({
    id: workflowRunId,
    status: ExecutionStatus.FAILED,
    error: {
      type: QUEUE_RUN_INVARIANT_ERROR_TYPE,
      message,
    },
    finishedAt,
  });
  logger.error(`Workflow execution ${workflowRunId} failed: ${message}`);
  return true;
}
