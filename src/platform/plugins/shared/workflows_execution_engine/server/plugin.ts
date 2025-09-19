/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';

import type { Client } from '@elastic/elasticsearch';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { v4 as generateUuid } from 'uuid';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowsExecutionEngineConfig } from './config';

import type {
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';

import { WORKFLOWS_EXECUTION_LOGS_INDEX } from '../common';
import { ConnectorExecutor } from './connector_executor';
import { UrlValidator } from './lib/url_validator';
import { StepExecutionRepository } from './repositories/step_execution_repository';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import { NodesFactory } from './step/nodes_factory';
import { WorkflowContextManager } from './workflow_context_manager/workflow_context_manager';
import { WorkflowExecutionRuntimeManager } from './workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowExecutionState } from './workflow_context_manager/workflow_execution_state';
import { WorkflowEventLogger } from './workflow_event_logger/workflow_event_logger';
import { workflowExecutionLoop } from './workflow_execution_loop';
import type {
  ResumeWorkflowExecutionParams,
  StartWorkflowExecutionParams,
} from './workflow_task_manager/types';
import { WorkflowTaskManager } from './workflow_task_manager/workflow_task_manager';

export class WorkflowsExecutionEnginePlugin
  implements Plugin<WorkflowsExecutionEnginePluginSetup, WorkflowsExecutionEnginePluginStart>
{
  private readonly logger: Logger;
  private readonly config: WorkflowsExecutionEngineConfig;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsExecutionEngineConfig>();
  }

  public setup(core: CoreSetup, plugins: WorkflowsExecutionEnginePluginSetupDeps) {
    this.logger.debug('workflows-execution-engine: Setup');

    const logger = this.logger;
    const config = this.config;

    plugins.taskManager.registerTaskDefinitions({
      'workflow:run': {
        title: 'Run Workflow',
        description: 'Executes a workflow immediately',
        timeout: '5m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, fakeRequest }) => {
          return {
            async run() {
              const { workflowRunId, spaceId } =
                taskInstance.params as StartWorkflowExecutionParams;
              const [coreStart, pluginsStart] = await core.getStartServices();
              const { actions, taskManager } =
                pluginsStart as WorkflowsExecutionEnginePluginStartDeps;

              // Get ES client from core services (guaranteed to be available at task execution time)
              const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
              const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);

              const {
                workflowRuntime,
                workflowExecutionState,
                workflowLogger,
                nodesFactory,
                workflowExecutionGraph,
              } = await createContainer(
                workflowRunId,
                spaceId,
                actions,
                taskManager,
                esClient,
                logger,
                config,
                workflowExecutionRepository,
                fakeRequest, // Provided by Task Manager's first-class API key support
                coreStart
              );
              await workflowRuntime.start();

              await workflowExecutionLoop(
                workflowRuntime,
                workflowExecutionState,
                workflowLogger,
                nodesFactory,
                workflowExecutionGraph
              );
            },
            async cancel() {
              // Cancel function for the task
            },
          };
        },
      },
    });
    plugins.taskManager.registerTaskDefinitions({
      'workflow:resume': {
        title: 'Resume Workflow',
        description: 'Resumes a paused workflow',
        timeout: '5m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance, fakeRequest }) => {
          return {
            async run() {
              const { workflowRunId, spaceId } =
                taskInstance.params as ResumeWorkflowExecutionParams;
              const [coreStart, pluginsStart] = await core.getStartServices();
              const { actions, taskManager } =
                pluginsStart as WorkflowsExecutionEnginePluginStartDeps;

              // Get ES client from core services (guaranteed to be available at task execution time)
              const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
              const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);

              const {
                workflowRuntime,
                workflowExecutionState,
                workflowLogger,
                nodesFactory,
                workflowExecutionGraph,
              } = await createContainer(
                workflowRunId,
                spaceId,
                actions,
                taskManager,
                esClient,
                logger,
                config,
                workflowExecutionRepository,
                fakeRequest, // Provided by Task Manager's first-class API key support
                coreStart
              );
              await workflowRuntime.resume();

              await workflowExecutionLoop(
                workflowRuntime,
                workflowExecutionState,
                workflowLogger,
                nodesFactory,
                workflowExecutionGraph
              );
            },
            async cancel() {},
          };
        },
      },
    });

    return {};
  }

  public start(core: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.debug('workflows-execution-engine: Start');

    const executeWorkflow = async (
      workflow: WorkflowExecutionEngineModel,
      context: Record<string, any>,
      request?: any // KibanaRequest for user-scoped execution
    ) => {
      const workflowCreatedAt = new Date();

      // Get ES client and create repository for this execution
      const esClient = core.elasticsearch.client.asInternalUser as Client;
      const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);

      const triggeredBy = context.triggeredBy || 'manual'; // 'manual' or 'scheduled'
      const workflowExecution = {
        id: generateUuid(),
        spaceId: context.spaceId,
        workflowId: workflow.id,
        isTestRun: workflow.isTestRun,
        workflowDefinition: workflow.definition,
        yaml: workflow.yaml,
        context,
        status: ExecutionStatus.PENDING,
        createdAt: workflowCreatedAt.toISOString(),
        createdBy: context.createdBy || '', // TODO: set if available
        lastUpdatedAt: workflowCreatedAt.toISOString(),
        lastUpdatedBy: context.createdBy || '', // TODO: set if available
        triggeredBy, // <-- new field for scheduled workflows
      } as Partial<EsWorkflowExecution>; // EsWorkflowExecution (add triggeredBy to type if needed)
      await workflowExecutionRepository.createWorkflowExecution(workflowExecution);

      // AUTO-DETECT: Check if we're already running in a Task Manager context
      const isRunningInTaskManager =
        triggeredBy === 'scheduled' ||
        context.source === 'task-manager' ||
        request?.isFakeRequest === true;

      if (isRunningInTaskManager) {
        // We're already in a task - execute directly without scheduling another task
        this.logger.info(
          `Executing workflow directly (already in Task Manager context): ${workflow.id}`
        );

        const {
          workflowRuntime,
          workflowExecutionState,
          workflowLogger,
          nodesFactory,
          workflowExecutionGraph,
        } = await createContainer(
          workflowExecution.id!,
          workflowExecution.spaceId!,
          plugins.actions,
          plugins.taskManager,
          esClient,
          this.logger,
          this.config,
          workflowExecutionRepository,
          request, // Pass the fakeRequest for user context
          core
        );

        await workflowRuntime.start();
        await workflowExecutionLoop(
          workflowRuntime,
          workflowExecutionState,
          workflowLogger,
          nodesFactory,
          workflowExecutionGraph
        );
      } else {
        // Normal manual execution - schedule a task
        const taskInstance = {
          id: `workflow:${workflowExecution.id}:${context.triggeredBy}`,
          taskType: 'workflow:run',
          params: {
            workflowRunId: workflowExecution.id,
            spaceId: workflowExecution.spaceId,
          } as StartWorkflowExecutionParams,
          state: {
            lastRunAt: null,
            lastRunStatus: null,
            lastRunError: null,
          },
          scope: ['workflows'],
          enabled: true,
        };

        // Use Task Manager's first-class API key support by passing the request
        // Task Manager will automatically create and manage the API key
        if (request) {
          // Debug: Log the user info from the original request
          this.logger.info(
            `Scheduling workflow task with user context for workflow ${workflow.id}`
          );
          await plugins.taskManager.schedule(taskInstance, { request });
        } else {
          this.logger.info(`Scheduling workflow task without user context`);
          await plugins.taskManager.schedule(taskInstance);
        }
      }
      return {
        workflowExecutionId: workflowExecution.id!,
      };
    };

    const cancelWorkflowExecution = async (workflowExecutionId: string, spaceId: string) => {
      const esClient = core.elasticsearch.client.asInternalUser as Client;
      const workflowExecutionRepository = new WorkflowExecutionRepository(esClient);
      const workflowExecution = await workflowExecutionRepository.getWorkflowExecutionById(
        workflowExecutionId,
        spaceId
      );

      if (!workflowExecution) {
        throw new WorkflowExecutionNotFoundError(workflowExecutionId);
      }

      if (
        [ExecutionStatus.CANCELLED, ExecutionStatus.COMPLETED, ExecutionStatus.FAILED].includes(
          workflowExecution.status
        )
      ) {
        // Already in a terminal state or being canceled
        return;
      }

      // Request cancellation
      await workflowExecutionRepository.updateWorkflowExecution({
        id: workflowExecution.id,
        cancelRequested: true,
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'system', // TODO: set user if available
      });

      if (
        [ExecutionStatus.WAITING, ExecutionStatus.WAITING_FOR_INPUT].includes(
          workflowExecution.status
        )
      ) {
        // TODO: handle WAITING states
        // It should clean up resume tasks, etc
      }
    };

    return {
      executeWorkflow,
      cancelWorkflowExecution,
    };
  }

  public stop() {}
}

async function createContainer(
  workflowRunId: string,
  spaceId: string,
  actionsPlugin: ActionsPluginStartContract,
  taskManagerPlugin: TaskManagerStartContract,
  esClient: Client,
  logger: Logger,
  config: WorkflowsExecutionEngineConfig,
  workflowExecutionRepository: WorkflowExecutionRepository,
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

  const workflowExecutionGraph = WorkflowGraph.fromWorkflowDefinition(
    workflowExecution.workflowDefinition
  );

  const unsecuredActionsClient = await actionsPlugin.getUnsecuredActionsClient();
  const stepExecutionRepository = new StepExecutionRepository(esClient);
  const connectorExecutor = new ConnectorExecutor(unsecuredActionsClient);

  const workflowLogger = new WorkflowEventLogger(
    esClient,
    logger,
    WORKFLOWS_EXECUTION_LOGS_INDEX,
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

  // fakeRequest is automatically created by Task Manager from taskInstance.apiKey
  // Will be undefined if no API key was provided when scheduling the workflow task

  const contextManager = new WorkflowContextManager({
    workflowExecutionGraph,
    workflowExecutionRuntime: workflowRuntime,
    workflowExecutionState,
    esClient: clientToUse, // Either user-scoped or fallback client
    fakeRequest, // Will be undefined if no API key provided
    coreStart, // For accessing Kibana's internal services
  });

  const workflowTaskManager = new WorkflowTaskManager(taskManagerPlugin);

  const urlValidator = new UrlValidator({
    allowedHosts: config.http.allowedHosts,
  });

  const nodesFactory = new NodesFactory(
    contextManager,
    connectorExecutor,
    workflowRuntime,
    workflowLogger,
    workflowTaskManager,
    urlValidator,
    workflowExecutionGraph
  );

  return {
    workflowExecutionGraph,
    workflowRuntime,
    workflowExecutionState,
    contextManager,
    connectorExecutor,
    workflowLogger,
    taskManagerPlugin,
    workflowExecutionRepository,
    workflowTaskManager,
    nodesFactory,
  };
}
