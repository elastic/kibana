/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { setupDependencies } from './setup_dependencies';
import type { WorkflowsExecutionEngineConfig } from '../config';
import type { WorkflowsMeteringService } from '../metering';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { workflowExecutionLoop } from '../workflow_execution_loop';

export async function resumeWorkflow({
  workflowRunId,
  spaceId,
  taskAbortController,
  dependencies,
  logger,
  config,
  fakeRequest,
  meteringService,
}: {
  workflowRunId: string;
  spaceId: string;
  taskAbortController: AbortController;
  logger: Logger;
  config: WorkflowsExecutionEngineConfig;
  fakeRequest: KibanaRequest;
  dependencies: ContextDependencies;
  meteringService?: WorkflowsMeteringService;
}): Promise<void> {
  const {
    workflowRuntime,
    stepExecutionRuntimeFactory,
    workflowExecutionState,
    workflowLogger,
    nodesFactory,
    workflowExecutionGraph,
    esClient,
    workflowTaskManager,
    workflowExecutionRepository,
  } = await setupDependencies(workflowRunId, spaceId, logger, config, dependencies, fakeRequest);

  await workflowRuntime.resume();

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

  // Report metering after execution completes and state is flushed.
  // This is fire-and-forget: the metering service handles retries and
  // will no-op for non-terminal states (e.g., WAITING for resume).
  if (meteringService) {
    try {
      const finalExecution = await workflowExecutionRepository.getWorkflowExecutionById(
        workflowRunId,
        spaceId
      );
      if (finalExecution) {
        void meteringService.reportWorkflowExecution(finalExecution, dependencies.cloudSetup);
      }
    } catch (err) {
      logger.warn(
        `Failed to fetch execution for metering (execution=${workflowRunId}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}
