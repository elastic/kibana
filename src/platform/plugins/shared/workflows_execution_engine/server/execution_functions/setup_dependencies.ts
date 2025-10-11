/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';

import type { Client } from '@elastic/elasticsearch';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowsExecutionEngineConfig } from '../config';

import { ConnectorExecutor } from '../connector_executor';
import { UrlValidator } from '../lib/url_validator';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { NodesFactory } from '../step/nodes_factory';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import { WorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';
import type { LogsRepository } from '../repositories/logs_repository/logs_repository';

export async function setupDependencies(
  workflowRunId: string,
  spaceId: string,
  actionsPlugin: ActionsPluginStartContract,
  taskManagerPlugin: TaskManagerStartContract,
  esClient: Client,
  logger: Logger,
  config: WorkflowsExecutionEngineConfig,
  workflowExecutionRepository: WorkflowExecutionRepository,
  stepExecutionRepository: StepExecutionRepository,
  logsRepository: LogsRepository,
  fakeRequest?: any, // KibanaRequest from task manager
  coreStart?: any // CoreStart for creating esClientAsUser
) {
  const workflowExecution = await workflowExecutionRepository.getWorkflowExecutionById(
    workflowRunId,
    spaceId
  );

  if (!workflowExecution) {
    throw new Error(`Workflow execution with ID ${workflowRunId} not found`);
  }

  let workflowExecutionGraph = WorkflowGraph.fromWorkflowDefinition(
    workflowExecution.workflowDefinition
  );

  // If the execution is for a specific step, narrow the graph to that step
  if (workflowExecution.stepId) {
    workflowExecutionGraph = workflowExecutionGraph.getStepGraph(workflowExecution.stepId);
  }

  const unsecuredActionsClient = await actionsPlugin.getUnsecuredActionsClient();
  const connectorExecutor = new ConnectorExecutor(unsecuredActionsClient);

  const workflowLogger = new WorkflowEventLogger(
    logsRepository,
    logger,
    {
      workflowId: workflowExecution.workflowId,
      workflowName: workflowExecution.workflowDefinition.name,
      executionId: workflowExecution.id,
      spaceId: workflowExecution.spaceId,
    },
    {
      enableConsoleLogging: config.logging.console,
    }
  );

  const workflowExecutionState = new WorkflowExecutionState(
    workflowExecution as EsWorkflowExecution,
    workflowExecutionRepository,
    stepExecutionRepository
  );

  // Create workflow runtime first (simpler, fewer dependencies)
  const workflowRuntime = new WorkflowExecutionRuntimeManager({
    workflowExecution: workflowExecution as EsWorkflowExecution,
    workflowExecutionGraph,
    workflowLogger,
    workflowExecutionState,
  });

  // Use user-scoped ES client if fakeRequest is available, otherwise fallback to regular client
  let clientToUse = esClient; // fallback
  if (fakeRequest && coreStart) {
    clientToUse = coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
  }

  const workflowTaskManager = new WorkflowTaskManager(taskManagerPlugin);

  const urlValidator = new UrlValidator({
    allowedHosts: config.http.allowedHosts,
  });

  const nodesFactory = new NodesFactory(
    connectorExecutor,
    workflowRuntime,
    workflowExecutionState,
    workflowLogger,
    workflowTaskManager,
    urlValidator,
    workflowExecutionGraph
  );

  return {
    workflowExecutionGraph,
    workflowRuntime,
    workflowExecutionState,
    connectorExecutor,
    workflowLogger,
    taskManagerPlugin,
    workflowExecutionRepository,
    workflowTaskManager,
    nodesFactory,
    fakeRequest,
    clientToUse,
    coreStart,
  };
}
