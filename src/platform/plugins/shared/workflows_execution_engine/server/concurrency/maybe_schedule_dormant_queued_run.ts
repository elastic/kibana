/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';

import { resumeSyncParentIfNeeded } from '../execution_functions/resume_sync_parent_if_needed';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { InternalResumeWorkflowExecution } from '../types';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

/**
 * When concurrency defers an execution to `queued`, schedule a dormant `workflow:run` task
 * using the trigger user's request so promotion can `runSoon` without privilege escalation.
 */
export async function maybeScheduleDormantQueuedRunIfNeeded({
  workflowExecutionId,
  spaceId,
  request,
  workflowExecutionRepository,
  workflowTaskManager,
  logger,
}: {
  workflowExecutionId: string;
  spaceId: string;
  request: KibanaRequest;
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowTaskManager: WorkflowTaskManager;
  logger: Logger;
}): Promise<void> {
  const execution = await workflowExecutionRepository.getWorkflowExecutionById(
    workflowExecutionId,
    spaceId
  );

  if (!execution || execution.status !== ExecutionStatus.QUEUED) {
    return;
  }

  const concurrency = execution.workflowDefinition?.settings?.concurrency;
  if (concurrency?.strategy !== 'queue') {
    return;
  }

  try {
    await workflowTaskManager.scheduleDormantQueuedRunTask({
      workflowExecution: execution,
      request,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Failed to schedule dormant queued workflow run for execution ${workflowExecutionId}: ${message}`
    );
  }
}

/**
 * Handles concurrency outcomes where the current execution did not proceed.
 *
 * This is intentionally for `queue` / `drop` style outcomes only: the current execution was
 * either moved to QUEUED or terminalized before a task could run. `cancel-in-progress` should
 * not use this helper for cancelled older executions; those executions keep their own task/request
 * context, and their running task should observe `cancelRequested` and resume any sync parent from
 * the normal post-loop path.
 */
export async function handleConcurrencyBlockedExecution({
  workflowExecutionId,
  spaceId,
  request,
  workflowExecutionRepository,
  workflowTaskManager,
  internalResumeWorkflowExecution,
  logger,
}: {
  workflowExecutionId: string;
  spaceId: string;
  request: KibanaRequest;
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowTaskManager: WorkflowTaskManager;
  internalResumeWorkflowExecution?: InternalResumeWorkflowExecution;
  logger: Logger;
}): Promise<void> {
  const execution = await workflowExecutionRepository.getWorkflowExecutionById(
    workflowExecutionId,
    spaceId
  );

  if (!execution) {
    return;
  }

  if (execution.status === ExecutionStatus.QUEUED) {
    await maybeScheduleDormantQueuedRunIfNeeded({
      workflowExecutionId,
      spaceId,
      request,
      workflowExecutionRepository,
      workflowTaskManager,
      logger,
    });
    return;
  }

  if (isTerminalStatus(execution.status)) {
    await resumeSyncParentIfNeeded({
      childExecution: execution,
      spaceId,
      fakeRequest: request,
      internalResumeWorkflowExecution,
      workflowTaskManager,
      logger,
    });
  }
}
