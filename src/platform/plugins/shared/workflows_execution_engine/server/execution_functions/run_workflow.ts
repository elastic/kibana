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
import { setupDependencies } from './setup_dependencies';
import { ConcurrencyManager } from '../concurrency/concurrency_manager';
import type { WorkflowsExecutionEngineConfig } from '../config';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { workflowExecutionLoop } from '../workflow_execution_loop';

export async function runWorkflow({
  workflowRunId,
  spaceId,
  taskAbortController,
  logger,
  config,
  fakeRequest,
  dependencies,
}: {
  workflowRunId: string;
  spaceId: string;
  taskAbortController: AbortController;
  logger: Logger;
  config: WorkflowsExecutionEngineConfig;
  fakeRequest: KibanaRequest;
  dependencies: ContextDependencies;
}): Promise<void> {
  const {
    workflowRuntime,
    stepExecutionRuntimeFactory,
    workflowExecutionState,
    workflowLogger,
    nodesFactory,
    workflowExecutionGraph,
    workflowTaskManager,
    workflowExecutionRepository,
    esClient,
  } = await setupDependencies(workflowRunId, spaceId, logger, config, dependencies, fakeRequest);

  // Check concurrency before starting execution (for queued executions)
  const workflowExecution = workflowExecutionState.getWorkflowExecution();

  // If execution is already cancelled, abort immediately
  if (workflowExecution.status === ExecutionStatus.CANCELLED) {
    logger.debug(`Workflow execution ${workflowRunId} is already cancelled, aborting before start`);
    taskAbortController.abort();
    return;
  }

  const concurrencyGroupKey = workflowExecution.context?.concurrencyGroupKey as string | undefined;

  if (concurrencyGroupKey) {
    const concurrencyManager = new ConcurrencyManager(
      logger,
      workflowExecutionRepository,
      workflowTaskManager
    );

    const concurrencyCheck = await concurrencyManager.checkConcurrency(
      workflowExecution.workflowId,
      workflowExecution.spaceId,
      concurrencyGroupKey,
      workflowExecution.workflowDefinition?.settings,
      workflowExecution.id
    );

    if (!concurrencyCheck.shouldProceed && workflowExecution.status === ExecutionStatus.PENDING) {
      logger.debug(`Workflow execution ${workflowRunId} still queued due to concurrency limit`);
      return;
    }

    // Re-check status after concurrency check - it might have been cancelled by another execution
    const updatedExecution = await workflowExecutionRepository.getWorkflowExecutionById(
      workflowExecution.id,
      workflowExecution.spaceId
    );
    if (updatedExecution?.status === ExecutionStatus.CANCELLED) {
      logger.debug(
        `Workflow execution ${workflowRunId} was cancelled during concurrency check, aborting`
      );
      taskAbortController.abort();
      // Update in-memory state to reflect cancellation
      workflowExecutionState.updateWorkflowExecution({
        status: ExecutionStatus.CANCELLED,
        cancelRequested: true,
        cancellationReason: updatedExecution.cancellationReason,
        cancelledAt: updatedExecution.cancelledAt,
        cancelledBy: updatedExecution.cancelledBy,
      });
      return;
    }
  }

  await workflowRuntime.start();

  await workflowExecutionLoop({
    workflowRuntime,
    stepExecutionRuntimeFactory,
    workflowExecutionState,
    workflowExecutionRepository,
    workflowLogger,
    nodesFactory,
    workflowExecutionGraph,
    esClient,
    fakeRequest,
    coreStart: dependencies.coreStart,
    taskAbortController,
    workflowTaskManager,
  });
}
