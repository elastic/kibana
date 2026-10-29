/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import {
  type EsWorkflowExecution,
  type EsWorkflowStepExecution,
  type WorkflowYaml,
} from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowLogApi, WorkflowStepCatalogApi, WorkflowStorageApi } from './tokens';
import type { ConnectorExecutor } from '../connector_executor';
import { defaultWorkflowSettings } from '../default_workflow_settings';
import type { LogsRepository } from '../repositories/logs_repository';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { NodesFactory } from '../step/nodes_factory';
import { StepExecutionRuntimeFactory } from '../workflow_context_manager/step_execution_runtime_factory';
import { StepIoService } from '../workflow_context_manager/step_io_service';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { WorkflowExecutionCursor } from '../workflow_context_manager/workflow_execution_cursor';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import { WorkflowRuntimeGraph } from '../workflow_context_manager/workflow_runtime_graph';
import { WorkflowEventLoggerFactory } from '../workflow_event_logger/workflow_event_logger_factory';
import { WorkflowEventQueue } from '../workflow_event_logger/workflow_event_queue';
import { workflowExecutionLoop } from '../workflow_execution_loop/workflow_execution_loop';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

interface EngineLoopRequest {
  execution: EsWorkflowExecution;
  scopeId: string;
  steps: WorkflowStepCatalogApi;
  storage: WorkflowStorageApi;
  log: WorkflowLogApi;
  resume: boolean;
}

/**
 * Builds the existing step walker in this isolate and runs it.
 * Plugin start contracts stay on the coordinator. This function calls them through the
 * storage and log capabilities. It does not call `setupDependencies`.
 */
export async function runWorkflowEngineInWorker(request: EngineLoopRequest): Promise<string> {
  const { execution, scopeId, steps, storage, log } = request;
  const compiled = WorkflowGraph.fromWorkflowDefinition(
    execution.workflowDefinition as WorkflowYaml,
    defaultWorkflowSettings
  );
  const workflowExecutionGraph = new WorkflowRuntimeGraph(compiled, execution.scopeStack ?? []);
  const workflowExecutionRepository = executionRepository(scopeId, storage);
  const stepExecutionRepository = stepRepository(scopeId, storage);
  const logger = noopLogger();
  const workflowExecutionState = new WorkflowExecutionState(
    execution,
    workflowExecutionRepository,
    logger
  );
  const stepIoService = new StepIoService({
    stepRepository: stepExecutionRepository,
    state: workflowExecutionState,
    // Finite so a later job reloads step outputs from storage. Infinity skips that fetch
    // and assumes the outputs are still in this isolate, which they are not after a pause.
    evictionMinBytes: 0,
    logger,
  });
  const eventQueue = new WorkflowEventQueue(logsRepository(log), logger);
  const loggerFactory = new WorkflowEventLoggerFactory(logger, eventQueue, false);
  const workflowLogger = loggerFactory.createExecutionLogger(
    execution.workflowId,
    execution.id,
    execution.workflowDefinition?.name
  );
  const fakeRequest = {} as KibanaRequest;
  const coreStart = {
    http: { basePath: { publicBaseUrl: 'http://127.0.0.1:5601', serverBasePath: '' } },
  } as unknown as CoreStart;
  const esClient = blockedEsClient();
  const dependencies = contextDependencies({
    coreStart,
    fakeRequest,
    execution,
    steps,
    scopeId,
  });
  const workflowExecutionCursor = new WorkflowExecutionCursor({
    workflowExecutionGraph,
    nodeId: execution.currentNodeId,
    stackFrames: execution.scopeStack ?? [],
  });
  const workflowRuntime = new WorkflowExecutionRuntimeManager({
    workflowExecution: execution,
    workflowExecutionGraph,
    workflowExecutionCursor,
    workflowLogger,
    workflowExecutionState,
    stepIoService,
    coreStart,
    dependencies,
  });
  const stepExecutionRuntimeFactory = new StepExecutionRuntimeFactory({
    workflowExecutionState,
    stepIoService,
    workflowExecutionGraph,
    workflowLogger,
    esClient,
    fakeRequest,
    coreStart,
    dependencies,
  });
  const nodesFactory = new NodesFactory(
    connectorStandIn(scopeId, storage),
    workflowRuntime,
    workflowLogger,
    workflowExecutionGraph,
    stepExecutionRuntimeFactory,
    dependencies,
    stepIoService
  );
  const abortController = new AbortController();

  if (request.resume) {
    await workflowRuntime.resume();
  } else {
    await workflowRuntime.start();
  }

  await workflowExecutionLoop({
    workflowExecutionGraph,
    workflowRuntime,
    workflowExecutionCursor,
    stepExecutionRuntimeFactory,
    workflowExecutionState,
    stepIoService,
    workflowLogger,
    eventQueue,
    workflowExecutionRepository,
    nodesFactory,
    esClient,
    fakeRequest,
    coreStart,
    signal: abortController.signal,
    workflowTaskManager: taskManagerStandIn(scopeId, storage),
  });

  return workflowRuntime.getWorkflowExecution().status;
}

function executionRepository(
  scopeId: string,
  storage: WorkflowStorageApi
): WorkflowExecutionRepository {
  return {
    updateWorkflowExecution: async (update: Partial<EsWorkflowExecution>) => {
      if (!update.id) {
        throw new Error('Remote execution update is missing an id');
      }
      await storage.updateExecution(
        scopeId,
        update as Partial<EsWorkflowExecution> & { id: string }
      );
    },
    getWorkflowExecutionCancelState: (id: string, spaceId: string) =>
      storage.getCancelState(scopeId, id, spaceId),
  } as unknown as WorkflowExecutionRepository;
}

function stepRepository(scopeId: string, storage: WorkflowStorageApi): StepExecutionRepository {
  return {
    bulkUpsert: (steps: Array<Partial<EsWorkflowStepExecution>>) =>
      storage.upsertSteps(scopeId, steps),
    getStepExecutionsByIds: (ids: string[], sourceIncludes?: string[], sourceExcludes?: string[]) =>
      storage.getSteps(scopeId, ids, sourceIncludes, sourceExcludes),
  } as unknown as StepExecutionRepository;
}

function logsRepository(log: WorkflowLogApi): LogsRepository {
  return {
    createLogs: async (events: readonly object[]) => {
      await log.write(events);
    },
  } as unknown as LogsRepository;
}

function taskManagerStandIn(scopeId: string, storage: WorkflowStorageApi): WorkflowTaskManager {
  return {
    scheduleResumeTask: async ({
      workflowExecution,
      resumeAt,
    }: {
      workflowExecution: EsWorkflowExecution;
      resumeAt: Date;
    }) =>
      storage.scheduleResume(
        scopeId,
        workflowExecution.id,
        workflowExecution.spaceId,
        resumeAt.toISOString()
      ),
  } as unknown as WorkflowTaskManager;
}

function connectorStandIn(scopeId: string, storage: WorkflowStorageApi): ConnectorExecutor {
  return {
    execute: (params: {
      connectorType: string;
      connectorNameOrId: string;
      input: Record<string, unknown>;
    }) => storage.executeConnector(scopeId, params),
  } as unknown as ConnectorExecutor;
}

function contextDependencies({
  coreStart,
  fakeRequest,
  execution,
  steps,
  scopeId,
}: {
  coreStart: CoreStart;
  fakeRequest: KibanaRequest;
  execution: EsWorkflowExecution;
  steps: WorkflowStepCatalogApi;
  scopeId: string;
}): ContextDependencies {
  const attribution = {
    type: 'workflow',
    id: execution.workflowId,
    name: execution.workflowDefinition?.name ?? '',
    runId: execution.id,
  };
  return {
    cloudSetup: undefined,
    coreStart,
    actions: {} as ContextDependencies['actions'],
    taskManager: {} as ContextDependencies['taskManager'],
    workflowsExtensions: {
      hasStepDefinition: (stepType: string) => steps.supports(stepType),
      getStepDefinition: (stepType: string) => ({
        id: stepType,
        handler: async (context: { input: unknown; config: unknown }) => {
          const result = await steps.run(
            stepType,
            scopeId,
            { with: context.input, config: context.config },
            { attribution }
          );
          return { output: unwrapOutput(result) };
        },
      }),
    } as unknown as ContextDependencies['workflowsExtensions'],
    config: { logging: { console: false } } as ContextDependencies['config'],
    spaceId: execution.spaceId,
    request: fakeRequest,
  };
}

function unwrapOutput(result: unknown): unknown {
  if (result && typeof result === 'object' && 'output' in result) {
    return (result as { output: unknown }).output;
  }
  return result;
}

function blockedEsClient(): ElasticsearchClient {
  const fail = () => {
    throw new Error('Elasticsearch calls from the worker must go through a coordinator capability');
  };
  return new Proxy(
    {},
    {
      get: () => fail,
    }
  ) as ElasticsearchClient;
}

function noopLogger(): Logger {
  const logger = {
    debug() {},
    info() {},
    warn() {},
    error() {},
    trace() {},
    fatal() {},
    log() {},
    isLevelEnabled() {
      return false;
    },
    get() {
      return logger;
    },
  };
  return logger as unknown as Logger;
}
