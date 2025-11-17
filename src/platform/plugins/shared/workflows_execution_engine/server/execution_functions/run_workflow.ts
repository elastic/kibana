/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { setupDependencies } from './setup_dependencies';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { LogsRepository } from '../repositories/logs_repository';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowsExecutionEnginePluginStartDeps } from '../types';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { workflowExecutionLoop } from '../workflow_execution_loop';

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
  esClient: ElasticsearchClient;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
  logsRepository?: LogsRepository;
  actions: ActionsPluginStartContract;
  taskManager: WorkflowsExecutionEnginePluginStartDeps['taskManager'];
  logger: Logger;
  config: WorkflowsExecutionEngineConfig;
  fakeRequest: KibanaRequest;
  dependencies: ContextDependencies;
}): Promise<void> {
  const logsRepositoryToUse = logsRepository ?? new LogsRepository(esClient);
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
    workflowTaskManager,
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
    logsRepositoryToUse,
    coreStart,
    dependencies,
    fakeRequest // Provided by Task Manager's first-class API key support
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
    workflowTaskManager,
  });
}
