/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { isTerminalStatus } from '@kbn/workflows';
import { handlePostExecutionLoop } from './handle_post_execution_loop';
import { setupDependencies } from './setup_dependencies';
import { isWorkflowGraphSetupError } from './workflow_graph_setup_error';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { emitWorkflowExecutionFailedEventIfFailed } from '../lib/emit_workflow_execution_failed_event';
import type { WorkflowsMeteringService } from '../metering';
import type { EsDocumentWithVersion } from '../repositories/document_version';
import type {
  InternalResumeWorkflowExecution,
  WorkflowsExecutionEnginePluginStart,
} from '../types';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { workflowExecutionLoop } from '../workflow_execution_loop';

export async function resumeWorkflow({
  workflowExecutionWithVersion,
  spaceId,
  taskAbortController,
  dependencies,
  logger,
  config,
  fakeRequest,
  workflowsExecutionEngine,
  meteringService,
  internalResumeWorkflowExecution,
}: {
  workflowExecutionWithVersion: EsDocumentWithVersion<EsWorkflowExecution>;
  spaceId: string;
  taskAbortController: AbortController;
  logger: Logger;
  config: WorkflowsExecutionEngineConfig;
  fakeRequest: KibanaRequest;
  dependencies: ContextDependencies;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  meteringService?: WorkflowsMeteringService;
  internalResumeWorkflowExecution?: InternalResumeWorkflowExecution;
}): Promise<void> {
  let setupResult: Awaited<ReturnType<typeof setupDependencies>>;
  const workflowRunId = workflowExecutionWithVersion.id;

  try {
    setupResult = await setupDependencies(
      workflowExecutionWithVersion,
      spaceId,
      logger,
      config,
      dependencies,
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
      return;
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
    workflowExecutionRepository,
  } = setupResult;

  const loadedExecution = workflowExecutionState.getWorkflowExecution();
  if (isTerminalStatus(loadedExecution.status)) {
    logger.info(
      `Resume skipped for ${workflowRunId}: already in terminal status ${loadedExecution.status}`
    );
    return;
  }

  await workflowRuntime.resume();

  try {
    await workflowExecutionLoop({
      workflowRuntime,
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
      taskAbortController,
      workflowTaskManager,
    });
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
    workflowExecutionState,
    spaceId,
    logger,
    fakeRequest,
    workflowExecutionRepository,
    internalResumeWorkflowExecution,
    workflowTaskManager,
    meteringService,
    cloudSetup: dependencies.cloudSetup,
  });
}
