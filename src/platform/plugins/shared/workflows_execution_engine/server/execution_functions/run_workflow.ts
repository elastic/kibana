/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { workflowExecutionLoop } from '../workflow_execution_loop';
import type { WorkflowsExecutionEnginePluginStartDeps } from '../types';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { setupDependencies } from './setup_dependencies';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { LogsRepository } from '../repositories/logs_repository/logs_repository';
import type { ContextDependencies } from '../workflow_context_manager/types';

export async function runWorkflow({
  workflowRunId,
  spaceId,
  taskAbortController,
  workflowExecutionRepository,
  stepExecutionRepository,
  logsRepository,
  coreStart,
  esClient,
  actions,
  taskManager,
  logger,
  config,
  fakeRequest,
  dependencies,
}: {
  workflowRunId: string;
  spaceId: string;
  taskAbortController: AbortController;
  coreStart: CoreStart;
  esClient: Client;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
  logsRepository: LogsRepository;
  actions: ActionsPluginStartContract;
  taskManager: WorkflowsExecutionEnginePluginStartDeps['taskManager'];
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
    clientToUse,
    fakeRequest: fakeRequestFromContainer,
    coreStart: coreStartFromContainer,
  } = await setupDependencies(
    workflowRunId,
    spaceId,
    actions,
    taskManager,
    esClient,
    logger,
    config,
    workflowExecutionRepository,
    stepExecutionRepository,
    logsRepository,
    dependencies,
    fakeRequest, // Provided by Task Manager's first-class API key support
    coreStart
  );
  await workflowRuntime.start();

  await workflowExecutionLoop({
    workflowRuntime,
    stepExecutionRuntimeFactory,
    workflowExecutionState,
    workflowExecutionRepository,
    workflowLogger,
    nodesFactory,
    workflowExecutionGraph,
    esClient: clientToUse,
    fakeRequest: fakeRequestFromContainer,
    coreStart: coreStartFromContainer,
    taskAbortController,
  });
}
