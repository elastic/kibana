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
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskRunAs } from '../service_account_execution';
import type { InternalResumeWorkflowExecution } from '../types';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

/**
 * When concurrency defers an execution to `queued`, schedule a dormant `workflow:run` task
 * using the trigger user's request so promotion can `runSoon` without privilege escalation.
 * A promotion that already moved it to `pending` still gets that task when none exists yet.
 */
export async function maybeScheduleDormantQueuedRunIfNeeded({
  workflowExecutionId,
  spaceId,
  request,
  runAs,
  workflowExecutionRepository,
  workflowTaskManager,
  logger,
}: {
  workflowExecutionId: string;
  spaceId: string;
  request: KibanaRequest;
  runAs?: WorkflowTaskRunAs;
  workflowExecutionRepository: WorkflowExecutionRepository;
  workflowTaskManager: WorkflowTaskManager;
  logger: Logger;
}): Promise<void> {
  const execution = await workflowExecutionRepository.getWorkflowExecutionById(
    workflowExecutionId,
    spaceId
  );

  if (
    !execution ||
    execution.workflowDefinition?.settings?.concurrency?.strategy !== 'queue' ||
    (execution.status !== ExecutionStatus.QUEUED && execution.status !== ExecutionStatus.PENDING)
  ) {
    return;
  }

  try {
    if (execution.status === ExecutionStatus.PENDING) {
      if (!execution.id || (await workflowTaskManager.hasActiveTaskForExecution(execution.id))) {
        return;
      }
    }

    await workflowTaskManager.scheduleDormantQueuedRunTask({
      workflowExecution: execution,
      request,
      runAs,
    });

    if (execution.status === ExecutionStatus.PENDING && execution.id) {
      await workflowTaskManager.promoteQueuedRunTask({
        executionId: execution.id,
        triggeredBy: execution.triggeredBy || 'manual',
      });
    }
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
  runAs,
  workflowExecutionRepository,
  stepExecutionRepository,
  workflowTaskManager,
  internalResumeWorkflowExecution,
  logger,
}: {
  workflowExecutionId: string;
  spaceId: string;
  request: KibanaRequest;
  runAs?: WorkflowTaskRunAs;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository?: StepExecutionRepository;
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

  if (execution.status === ExecutionStatus.QUEUED || execution.status === ExecutionStatus.PENDING) {
    await maybeScheduleDormantQueuedRunIfNeeded({
      workflowExecutionId,
      spaceId,
      request,
      runAs,
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
      internalResumeWorkflowExecution,
      workflowExecutionRepository,
      stepExecutionRepository,
      workflowTaskManager,
      logger,
    });
  }
}
