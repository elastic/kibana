/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';

import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
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
