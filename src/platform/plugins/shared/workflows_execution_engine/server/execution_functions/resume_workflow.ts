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
import { handlePostExecutionLoop } from './handle_post_execution_loop';
import { setupDependencies } from './setup_dependencies';
import { isWorkflowGraphSetupError } from './workflow_graph_setup_error';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { emitWorkflowExecutionFailedEventIfFailed } from '../lib/emit_workflow_execution_failed_event';
import type { WorkflowsMeteringService } from '../metering';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type {
  InternalResumeWorkflowExecution,
  WorkflowsExecutionEnginePluginStart,
} from '../types';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { workflowExecutionLoop } from '../workflow_execution_loop';
import {
  ensureWorkflowIdleTimeoutResumeAfterLoop,
  getIdleTimeoutResumeDeadlineMs,
} from '../workflow_execution_loop/handle_execution_delay';

export async function resumeWorkflow({
  workflowRunId,
  spaceId,
  signal,
  dependencies,
  logger,
  config,
  fakeRequest,
  workflowsExecutionEngine,
  meteringService,
  internalResumeWorkflowExecution,
  workflowExecutionRepository,
  stepExecutionRepository,
}: {
  workflowRunId: string;
  spaceId: string;
  signal: AbortSignal;
  logger: Logger;
  config: WorkflowsExecutionEngineConfig;
  fakeRequest: KibanaRequest;
  dependencies: ContextDependencies;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  meteringService?: WorkflowsMeteringService;
  internalResumeWorkflowExecution?: InternalResumeWorkflowExecution;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
}): Promise<{ retryAt?: Date }> {
  let setupResult: Awaited<ReturnType<typeof setupDependencies>>;
  try {
    setupResult = await setupDependencies(
      workflowRunId,
      spaceId,
      logger,
      config,
      dependencies,
      workflowExecutionRepository,
      stepExecutionRepository,
      fakeRequest,
      workflowsExecutionEngine
    );
  } catch (error) {
    // The graph could not be built — a permanent author error (the parallel
    // branch-body constraints, normally caught in the editor by validateGraphBuild
    // but reachable here for API/imported/legacy workflows that bypass the UI).
    // setupDependencies has already persisted the execution as FAILED with the
    // graph-build reason; return cleanly so the resume task does not surface an
    // opaque TaskRecoveryError.
    if (isWorkflowGraphSetupError(error)) {
      return {};
    }
    throw error;
  }

  const {
    workflowRuntime,
    stepExecutionRuntimeFactory,
    workflowExecutionState,
    stepIoService,
    workflowLogger,
    nodesFactory,
    workflowExecutionGraph,
    esClient,
    workflowTaskManager,
    workflowExecutionCursor,
  } = setupResult;

  const loadedExecution = workflowExecutionState.getWorkflowExecution();
  if (isTerminalStatus(loadedExecution.status)) {
    logger.info(
      `Resume skipped for ${workflowRunId}: already in terminal status ${loadedExecution.status}`
    );
    return {};
  }

  const node = loadedExecution.currentNodeId ? workflowRuntime.getCurrentNode() : undefined;
  if (
    loadedExecution.status === ExecutionStatus.WAITING &&
    !loadedExecution.cancelRequested &&
    node?.type !== 'enter-parallel' &&
    node?.stepId
  ) {
    // Deadline checks need persisted step metadata before resume changes the execution status.
    await stepIoService.load();
    const stepExecution = workflowExecutionState.getLatestStepExecution(node.stepId);
    const resumeAt = stepExecution?.state?.resumeAt;
    if (typeof resumeAt === 'string') {
      const deadline = getIdleTimeoutResumeDeadlineMs(
        { workflowExecutionGraph, workflowExecutionState },
        loadedExecution,
        workflowExecutionCursor.currentStackFrames,
        { node, startedAt: stepExecution?.startedAt }
      );
      const nextRunAt = Math.min(new Date(resumeAt).getTime(), deadline ?? Infinity);
      if (nextRunAt > Date.now()) {
        // Late notifications preserve wait durations without postponing enclosing timeouts.
        return { retryAt: new Date(nextRunAt) };
      }
    }
  }

  await workflowRuntime.resume();

  const workflowExecutionLoopParams = {
    workflowRuntime,
    workflowExecutionCursor,
    stepExecutionRuntimeFactory,
    workflowExecutionState,
    stepIoService,
    workflowExecutionRepository,
    workflowLogger,
    nodesFactory,
    workflowExecutionGraph,
    esClient,
    fakeRequest,
    coreStart: dependencies.coreStart,
    signal,
    workflowTaskManager,
  };

  try {
    await workflowExecutionLoop(workflowExecutionLoopParams);
    await ensureWorkflowIdleTimeoutResumeAfterLoop(workflowExecutionLoopParams);
  } finally {
    await emitWorkflowExecutionFailedEventIfFailed({
      workflowRuntime,
      workflowExecutionState,
      emitEvent: workflowsExecutionEngine.triggerEvents.emitEvent,
      request: fakeRequest,
      logger,
      workflowRunId,
    });
  }

  await handlePostExecutionLoop({
    workflowRunId,
    spaceId,
    logger,
    fakeRequest,
    workflowExecutionRepository,
    internalResumeWorkflowExecution,
    workflowTaskManager,
    meteringService,
    cloudSetup: dependencies.cloudSetup,
  });

  return {};
}
