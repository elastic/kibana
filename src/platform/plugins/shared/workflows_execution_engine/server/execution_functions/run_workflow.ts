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
  } = await setupDependencies(workflowRunId, spaceId, logger, config, dependencies, fakeRequest);
  setupSpan?.end();

  // Span for runtime initialization
  const startSpan = apm.startSpan('workflow runtime start', 'workflow', 'initialization');
  await workflowRuntime.start();
  startSpan?.end();

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
}
