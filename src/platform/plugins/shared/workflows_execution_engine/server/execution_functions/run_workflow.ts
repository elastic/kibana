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
import { ExecutionStatus, isTriggerType } from '@kbn/workflows';
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
  isEventDrivenExecutionEnabled,
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
  isEventDrivenExecutionEnabled?: () => boolean;
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
    workflowExecutionRepository,
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

  // Execution-time gate: skip event-driven runs when the kill switch is disabled
  if (isEventDrivenExecutionEnabled) {
    const execution = await workflowExecutionRepository.getWorkflowExecutionById(
      workflowRunId,
      spaceId
    );
    if (execution) {
      const triggeredBy = execution.triggeredBy;
      const isEventDriven = triggeredBy != null && !isTriggerType(triggeredBy);
      if (isEventDriven && !isEventDrivenExecutionEnabled()) {
        await workflowExecutionRepository.updateWorkflowExecution({
          id: workflowRunId,
          status: ExecutionStatus.SKIPPED,
          cancellationReason: 'Event-driven execution disabled by operator',
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'system',
        });
        logger.debug(
          `Event-driven execution is disabled; skipping workflow run ${workflowRunId} (triggeredBy: ${triggeredBy}).`
        );
        return;
      }
    }
  }

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
