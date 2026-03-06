/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import apm from 'elastic-apm-node';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { setupDependencies } from './setup_dependencies';
import type { WorkflowsExecutionEngineConfig } from '../config';
import type { WorkflowsMeteringService } from '../metering';
import type { WorkflowsExecutionEnginePluginStart } from '../types';
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
  workflowsExecutionEngine,
  meteringService,
}: {
  workflowRunId: string;
  spaceId: string;
  taskAbortController: AbortController;
  logger: Logger;
  config: WorkflowsExecutionEngineConfig;
  fakeRequest: KibanaRequest;
  dependencies: ContextDependencies;
  workflowsExecutionEngine?: WorkflowsExecutionEnginePluginStart;
  meteringService?: WorkflowsMeteringService;
}): Promise<void> {
  // Span for setup/initialization phase
  const setupSpan = apm.startSpan('workflow setup', 'workflow', 'setup');
  const {
    workflowRuntime,
    stepExecutionRuntimeFactory,
    workflowExecutionState,
    workflowLogger,
    nodesFactory,
    workflowExecutionGraph,
    workflowTaskManager,
    executionStateRepository,
    esClient,
  } = await setupDependencies(
    workflowRunId,
    spaceId,
    logger,
    config,
    dependencies,
    fakeRequest,
    workflowsExecutionEngine
  );
  setupSpan?.end();

  // Span for runtime initialization (graph building, topsort, etc.)
  const startSpan = apm.startSpan('workflow runtime start', 'workflow', 'initialization');
  try {
    await workflowRuntime.start();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(
      `Workflow execution ${workflowRunId} failed during runtime start: ${errorMessage}`
    );
    if (errorStack) {
      logger.error(`Workflow execution ${workflowRunId} runtime start error stack: ${errorStack}`);
    }
    throw error;
  } finally {
    startSpan?.end();
  }

  // Span for the main execution loop
  const loopSpan = apm.startSpan('workflow execution loop', 'workflow', 'execution');
  try {
    await workflowExecutionLoop({
      workflowRuntime,
      stepExecutionRuntimeFactory,
      workflowExecutionState,
      executionStateRepository,
      workflowLogger,
      nodesFactory,
      workflowExecutionGraph,
      esClient,
      fakeRequest,
      coreStart: dependencies.coreStart,
      taskAbortController,
      workflowTaskManager,
    });
    loopSpan?.setOutcome('success');
  } catch (error) {
    loopSpan?.setOutcome('failure');
    throw error;
  } finally {
    loopSpan?.end();
  }

  // Report metering after execution completes and state is flushed.
  // This is fire-and-forget: the metering service handles retries and
  // will no-op for non-terminal states (e.g., WAITING for resume).
  if (meteringService) {
    try {
      const response = await executionStateRepository.getWorkflowExecutions(
        new Set([workflowRunId]),
        spaceId
      );
      if (workflowRunId in response) {
        void meteringService.reportWorkflowExecution(
          response[workflowRunId],
          dependencies.cloudSetup
        );
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
