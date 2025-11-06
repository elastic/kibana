/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution, WorkflowSettings } from '@kbn/workflows';

import { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowsExecutionEngineConfig } from '../config';

import { ConnectorExecutor } from '../connector_executor';
import { UrlValidator } from '../lib/url_validator';
import type { LogsRepository } from '../repositories/logs_repository';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { NodesFactory } from '../step/nodes_factory';
import { StepExecutionRuntimeFactory } from '../workflow_context_manager/step_execution_runtime_factory';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import { WorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

const defaultWorkflowSettings: WorkflowSettings = {
  timeout: '6h',
};

export async function setupDependencies(
  workflowRunId: string,
  spaceId: string,
  actionsPlugin: ActionsPluginStartContract,
  taskManagerPlugin: TaskManagerStartContract,
  esClient: ElasticsearchClient,
  logger: Logger,
  config: WorkflowsExecutionEngineConfig,
  workflowExecutionRepository: WorkflowExecutionRepository,
  stepExecutionRepository: StepExecutionRepository,
  logsRepository: LogsRepository,
  coreStart: CoreStart, // CoreStart for creating esClientAsUser
  dependencies: ContextDependencies,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fakeRequest?: any // KibanaRequest from task manager
) {
  const workflowExecution = await workflowExecutionRepository.getWorkflowExecutionById(
    workflowRunId,
    spaceId
  );

  if (!workflowExecution) {
    throw new Error(`Workflow execution with ID ${workflowRunId} not found`);
  }

  let workflowExecutionGraph = WorkflowGraph.fromWorkflowDefinition(
    workflowExecution.workflowDefinition,
    defaultWorkflowSettings
  );

  // If the execution is for a specific step, narrow the graph to that step
  if (workflowExecution.stepId) {
    workflowExecutionGraph = workflowExecutionGraph.getStepGraph(workflowExecution.stepId);
  }

  // Use scoped actions client when fakeRequest is available to preserve user context
  // Otherwise fallback to unsecured actions client
  // TODO(tb): Consider completely disabling connectors when no fakeRequest is available
  let connectorExecutor: ConnectorExecutor;
  if (fakeRequest) {
    const scopedActionsClient = await actionsPlugin.getActionsClientWithRequest(fakeRequest);
    connectorExecutor = new ConnectorExecutor(scopedActionsClient, true);
  } else {
    const unsecuredActionsClient = await actionsPlugin.getUnsecuredActionsClient();
    connectorExecutor = new ConnectorExecutor(unsecuredActionsClient, false);
  }

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
  let clientToUse: ElasticsearchClient = esClient; // fallback
  if (fakeRequest && coreStart) {
    clientToUse = coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
  }

  const workflowTaskManager = new WorkflowTaskManager(taskManagerPlugin);

  const urlValidator = new UrlValidator({
    allowedHosts: config.http.allowedHosts,
  });

  const stepExecutionRuntimeFactory = new StepExecutionRuntimeFactory({
    workflowExecutionGraph,
    workflowExecutionState,
    workflowLogger,
    esClient: clientToUse,
    fakeRequest,
    coreStart,
    dependencies,
  });

  const nodesFactory = new NodesFactory(
    connectorExecutor,
    workflowRuntime,
    workflowLogger,
    workflowTaskManager,
    urlValidator,
    workflowExecutionGraph,
    stepExecutionRuntimeFactory
  );

  return {
    workflowExecutionGraph,
    workflowRuntime,
    stepExecutionRuntimeFactory,
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
