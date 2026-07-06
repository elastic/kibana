/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus, WorkflowRepository } from '@kbn/workflows';
import { isGraphBuildError, WorkflowGraph } from '@kbn/workflows/graph';
import { setupRepositories } from './setup_repositories';
import { WorkflowGraphSetupError } from './workflow_graph_setup_error';
import type { WorkflowsExecutionEngineConfig } from '../config';

import { ConnectorExecutor } from '../connector_executor';
import { defaultWorkflowSettings } from '../default_workflow_settings';
import {
  extractEventChainDepthFromExecution,
  extractEventChainVisitedWorkflowIdsFromExecution,
  mergeEmitterWorkflowIntoEventChainVisited,
} from '../lib/telemetry/utils/extract_execution_metadata';
import { WorkflowExecutionTelemetryClient } from '../lib/telemetry/workflow_execution_telemetry_client';
import type { EsDocumentWithVersion } from '../repositories/document_version';
import { NodesFactory } from '../step/nodes_factory';
import { setWorkflowEventChainContext } from '../trigger_events/event_context/event_chain_context';
import type { WorkflowsExecutionEnginePluginStart } from '../types';
import { StepExecutionRuntimeFactory } from '../workflow_context_manager/step_execution_runtime_factory';
import { StepIoService } from '../workflow_context_manager/step_io_service';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';

import { WorkflowEventLoggerService } from '../workflow_event_logger';
import { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

export async function setupDependencies(
  workflowExecutionWithVersion: EsDocumentWithVersion<EsWorkflowExecution>,
  spaceId: string,
  logger: Logger,
  config: WorkflowsExecutionEngineConfig,
  dependencies: ContextDependencies,
  fakeRequest?: KibanaRequest,
  workflowsExecutionEngine?: WorkflowsExecutionEnginePluginStart
) {
  const { coreStart, actions, taskManager, workflowsExtensions } = dependencies;

  const workflowRunId = workflowExecutionWithVersion.doc.id;

  // Get ES client from core services (guaranteed to be available at task execution time)
  const internalEsClient = coreStart.elasticsearch.client.asInternalUser;

  const { workflowExecutionRepository, stepExecutionRepository } = await setupRepositories(
    coreStart
  );
  const workflowRepository = new WorkflowRepository({
    esClient: internalEsClient,
    logger,
  });

  // Wait for the workflows extensions registries to be ready
  await workflowsExtensions.isReady();

  if (!fakeRequest) {
    logger.error('Cannot execute a workflow without Kibana Request');
    throw new Error(
      `Workflow execution id ${workflowRunId} cannot execute a workflow without Kibana Request`
    );
  }

  const workflowExecutionState = new WorkflowExecutionState(
    workflowExecutionWithVersion,
    workflowExecutionRepository
  );
  const workflowExecution = workflowExecutionState.getWorkflowExecution();

  const eventChainDepth = extractEventChainDepthFromExecution(workflowExecution) ?? -1;
  const baseVisited = extractEventChainVisitedWorkflowIdsFromExecution(
    workflowExecution,
    config.eventDriven.maxChainDepth
  );
  const visitedWorkflowIds = mergeEmitterWorkflowIntoEventChainVisited(
    baseVisited,
    workflowExecution.workflowId,
    config.eventDriven.maxChainDepth
  );
  setWorkflowEventChainContext(fakeRequest, {
    depth: eventChainDepth,
    sourceExecutionId: workflowExecution.id,
    ...(visitedWorkflowIds.length > 0 ? { visitedWorkflowIds } : {}),
  });

  // Compiling the definition into its execution graph can throw a GraphBuildError
  // for a structurally-unsupported workflow (currently only the parallel-branch
  // constraints: nested flow-control / unsupported step types inside a branch
  // body). This same rule is validated in the editor (see the client-side
  // `validateGraphBuild`, which squiggles the offending step), so authored-in-UI
  // workflows are rejected before they ever run. This block is the defense-in-depth
  // runtime net for the paths that bypass the editor — API/programmatic creation,
  // imports, or workflows authored before the constraint existed. It is a permanent
  // author error, not a transient fault, so we mark the execution FAILED with the
  // actionable message and rethrow a typed, non-retryable error — otherwise the raw
  // throw escapes the task runner and the run is force-recovered into an opaque
  // "Execution abandoned" TaskRecoveryError with no failure reason and no step records.
  let workflowExecutionGraph: WorkflowGraph;
  try {
    workflowExecutionGraph = WorkflowGraph.fromWorkflowDefinition(
      workflowExecution.workflowDefinition,
      defaultWorkflowSettings
    );
  } catch (error) {
    if (isGraphBuildError(error)) {
      const finishedAt = new Date();
      await workflowExecutionRepository.updateWorkflowExecution({
        id: workflowRunId,
        status: ExecutionStatus.FAILED,
        error: { type: 'GraphBuildError', message: error.message },
        finishedAt: finishedAt.toISOString(),
        duration: finishedAt.getTime() - new Date(workflowExecution.startedAt).getTime(),
      });
      logger.error(
        `Workflow execution ${workflowRunId} failed to build its execution graph: ${error.message}`
      );
      throw new WorkflowGraphSetupError(error.message);
    }
    throw error;
  }

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

  const stepIoService = new StepIoService({
    stepRepository: stepExecutionRepository,
    state: workflowExecutionState,
    evictionMinBytes: config.eviction.minPayloadSize.getValueInBytes(),
    logger,
  });
  if (workflowExecutionState.getWorkflowExecutionStepExecutionIds()) {
    await stepIoService.load();
  }

  // Create telemetry client
  const telemetryClient = new WorkflowExecutionTelemetryClient(coreStart.analytics, logger);

  // Create workflow runtime first (simpler, fewer dependencies)
  const workflowRuntime = new WorkflowExecutionRuntimeManager({
    workflowExecutionGraph,
    workflowLogger,
    workflowExecutionState,
    stepIoService,
    coreStart,
    dependencies,
    telemetryClient,
  });

  const esClient: ElasticsearchClient =
    coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;

  const workflowTaskManager = new WorkflowTaskManager(taskManager);

  const enhancedDependencies: ContextDependencies = {
    ...dependencies,
    workflowRepository,
    workflowExecutionRepository,
    stepExecutionRepository,
    workflowsExecutionEngine,
    spaceId,
    request: fakeRequest,
  };

  const stepExecutionRuntimeFactory = new StepExecutionRuntimeFactory({
    workflowExecutionGraph,
    workflowExecutionState,
    stepIoService,
    workflowLogger,
    esClient,
    fakeRequest,
    coreStart,
    dependencies: enhancedDependencies,
  });

  const nodesFactory = new NodesFactory(
    connectorExecutor,
    workflowRuntime,
    workflowLogger,
    workflowExecutionGraph,
    stepExecutionRuntimeFactory,
    enhancedDependencies,
    stepIoService
  );

  return {
    workflowExecutionGraph,
    workflowRuntime,
    stepExecutionRuntimeFactory,
    workflowExecutionState,
    stepIoService,
    workflowLogger,
    workflowTaskManager,
    nodesFactory,
    workflowExecutionRepository,
    esClient,
    telemetryClient,
  };
}
