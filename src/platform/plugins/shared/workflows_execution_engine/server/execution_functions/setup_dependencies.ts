/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowSettings } from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowsExecutionEngineConfig } from '../config';

import { ConnectorExecutor } from '../connector_executor';
import { WorkflowExecutionTelemetryClient } from '../lib/telemetry/workflow_execution_telemetry_client';
import { UrlValidator } from '../lib/url_validator';
import { StepExecutionRepository } from '../repositories/step_execution_repository';
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { NodesFactory } from '../step/nodes_factory';
import { StepExecutionRuntimeFactory } from '../workflow_context_manager/step_execution_runtime_factory';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';

import { WorkflowEventLoggerService } from '../workflow_event_logger';
import { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

const defaultWorkflowSettings: WorkflowSettings = {
  timeout: '6h',
};

export async function setupDependencies(
  workflowRunId: string,
  spaceId: string,
  logger: Logger,
  config: WorkflowsExecutionEngineConfig,
  dependencies: ContextDependencies,
  fakeRequest?: KibanaRequest
) {
  const { coreStart, actions, taskManager } = dependencies;

  // Get ES client from core services (guaranteed to be available at task execution time)
  const internalEsClient = coreStart.elasticsearch.client.asInternalUser;

  const workflowExecutionRepository = new WorkflowExecutionRepository(internalEsClient);
  const stepExecutionRepository = new StepExecutionRepository(internalEsClient);

  const workflowExecution = await workflowExecutionRepository.getWorkflowExecutionById(
    workflowRunId,
    spaceId
  );

  if (!workflowExecution) {
    throw new Error(`Workflow execution with ID ${workflowRunId} not found`);
  }

  if (!fakeRequest) {
    logger.error('Cannot execute a workflow without Kibana Request');
    throw new Error(
      `Workflow execution id ${workflowRunId} cannot execute a workflow without Kibana Request`
    );
  }

  let workflowExecutionGraph = WorkflowGraph.fromWorkflowDefinition(
    workflowExecution.workflowDefinition,
    defaultWorkflowSettings
  );

  // If the execution is for a specific step, narrow the graph to that step
  if (workflowExecution.stepId) {
    workflowExecutionGraph = workflowExecutionGraph.getStepGraph(workflowExecution.stepId);
  }

  const scopedActionsClient = await actions.getActionsClientWithRequest(fakeRequest);
  const connectorExecutor = new ConnectorExecutor(scopedActionsClient);

  const workflowEventLoggerService = new WorkflowEventLoggerService(
    dependencies.coreStart.dataStreams,
    logger,
    config.logging.console
  );

  const workflowLogger = workflowEventLoggerService.createLogger({
    workflowId: workflowExecution.workflowId,
    workflowName: workflowExecution.workflowDefinition.name,
    executionId: workflowExecution.id,
    spaceId: workflowExecution.spaceId,
  });

  const workflowExecutionState = new WorkflowExecutionState(
    workflowExecution as EsWorkflowExecution,
    workflowExecutionRepository,
    stepExecutionRepository
  );

  // Create telemetry client
  const telemetryClient = new WorkflowExecutionTelemetryClient(coreStart.analytics, logger);

  // Create workflow runtime first (simpler, fewer dependencies)
  const workflowRuntime = new WorkflowExecutionRuntimeManager({
    workflowExecution: workflowExecution as EsWorkflowExecution,
    workflowExecutionGraph,
    workflowLogger,
    workflowExecutionState,
    coreStart,
    dependencies,
    telemetryClient,
  });

  const esClient: ElasticsearchClient =
    coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;

  const workflowTaskManager = new WorkflowTaskManager(taskManager);

  const urlValidator = new UrlValidator({
    allowedHosts: config.http.allowedHosts,
  });

  const stepExecutionRuntimeFactory = new StepExecutionRuntimeFactory({
    workflowExecutionGraph,
    workflowExecutionState,
    workflowLogger,
    esClient,
    fakeRequest,
    coreStart,
    dependencies,
  });

  const nodesFactory = new NodesFactory(
    connectorExecutor,
    workflowRuntime,
    workflowLogger,
    urlValidator,
    workflowExecutionGraph,
    stepExecutionRuntimeFactory,
    dependencies
  );

  return {
    workflowExecutionGraph,
    workflowRuntime,
    stepExecutionRuntimeFactory,
    workflowExecutionState,
    workflowLogger,
    workflowTaskManager,
    nodesFactory,
    workflowExecutionRepository,
    esClient,
  };
}
