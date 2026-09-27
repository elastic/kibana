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
import { completeIdentityFailureCleanup } from './complete_identity_failure_cleanup';
import { finalizeWorkflowIdentityFailure } from './finalize_workflow_identity_failure';
import { handlePostExecutionLoop } from './handle_post_execution_loop';
import { setupDependencies } from './setup_dependencies';
import { isWorkflowGraphSetupError } from './workflow_graph_setup_error';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { emitWorkflowExecutionFailedEventIfFailed } from '../lib/emit_workflow_execution_failed_event';
import { emitWorkflowIdentityFailureEvent } from '../lib/emit_workflow_identity_failure_event';
import type { WorkflowsMeteringService } from '../metering';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { withWorkflowExecutionIdentity } from '../service_account_execution';
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
import { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

async function resumeWorkflowWithRequest({
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

  const waitingForInput = loadedExecution.status === ExecutionStatus.WAITING_FOR_INPUT;
  const hasResumeInput = loadedExecution.context?.resumeInput != null;
  const node = loadedExecution.currentNodeId ? workflowRuntime.getCurrentNode() : undefined;
  if (
    !loadedExecution.cancelRequested &&
    (loadedExecution.status === ExecutionStatus.WAITING || (waitingForInput && !hasResumeInput)) &&
    node?.type !== 'enter-parallel' &&
    node?.stepId
  ) {
    // Read persisted metadata before deciding whether this notification may advance the workflow.
    await stepIoService.load();
    const stepExecution = workflowExecutionState.getLatestStepExecution(node.stepId);
    const deadline = getIdleTimeoutResumeDeadlineMs(
      { workflowExecutionGraph, workflowExecutionState },
      loadedExecution,
      workflowExecutionCursor.currentStackFrames,
      { node, startedAt: stepExecution?.startedAt, state: stepExecution?.state }
    );
    const resumeAt = stepExecution?.state?.resumeAt;
    const waitDeadline = typeof resumeAt === 'string' ? new Date(resumeAt).getTime() : Infinity;
    const nextRunAt = Math.min(waitingForInput ? Infinity : waitDeadline, deadline ?? Infinity);
    if ((waitingForInput || typeof resumeAt === 'string') && nextRunAt > Date.now()) {
      // A notification is not approval. Keep HITL parked until input, cancellation, or a deadline.
      if (!Number.isFinite(nextRunAt)) return {};
      return { retryAt: new Date(nextRunAt) };
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
    workflowExecutionRepository,
    stepExecutionRepository,
    internalResumeWorkflowExecution,
    workflowTaskManager,
    meteringService,
    cloudSetup: dependencies.cloudSetup,
  });

  return {};
}

export const resumeWorkflow = async (
  params: Parameters<typeof resumeWorkflowWithRequest>[0]
): ReturnType<typeof resumeWorkflowWithRequest> => {
  const execution = await params.workflowExecutionRepository.getWorkflowExecutionById(
    params.workflowRunId,
    params.spaceId
  );
  if (!execution) {
    throw new Error('Workflow execution not found.');
  }
  if (isTerminalStatus(execution.status)) {
    await completeIdentityFailureCleanup(execution, {
      ...params,
      workflowTaskManager: new WorkflowTaskManager(params.dependencies.taskManager),
      cloudSetup: params.dependencies.cloudSetup,
    });
    return {};
  }
  let enteredExecution = false;
  try {
    return await withWorkflowExecutionIdentity(
      params.dependencies.coreStart,
      execution,
      params.fakeRequest,
      (fakeRequest) => {
        enteredExecution = true;
        return resumeWorkflowWithRequest({ ...params, fakeRequest });
      }
    );
  } catch (error) {
    if (!enteredExecution && execution.workflowDefinition?.settings?.run_as) {
      const executionError = {
        type: 'ServiceAccountExecutionError',
        message: error instanceof Error ? error.message : String(error),
      };
      const failedExecution = await finalizeWorkflowIdentityFailure({
        ...params,
        error: executionError,
      });
      if (!failedExecution) throw error;
      if (failedExecution.status === ExecutionStatus.FAILED) {
        await emitWorkflowIdentityFailureEvent({
          execution: failedExecution,
          request: params.fakeRequest,
          emitEvent: params.workflowsExecutionEngine.triggerEvents.emitEvent,
          logger: params.logger,
          maxEventChainDepth: params.config.eventDriven.maxChainDepth,
        });
      }
      await completeIdentityFailureCleanup(failedExecution, {
        ...params,
        workflowTaskManager: new WorkflowTaskManager(params.dependencies.taskManager),
        cloudSetup: params.dependencies.cloudSetup,
      });
    }
    throw error;
  }
};
