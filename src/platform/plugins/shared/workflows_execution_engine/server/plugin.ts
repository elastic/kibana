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
import { convertToWorkflowGraph } from '@kbn/workflows/graph';
import { ExecutionStatus } from '@kbn/workflows';

import { v4 as generateUuid } from 'uuid';
import { Client } from '@elastic/elasticsearch';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { WorkflowsExecutionEngineConfig } from './config';

import type {
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';

import { WORKFLOWS_EXECUTION_LOGS_INDEX } from '../common';
import { ConnectorExecutor } from './connector_executor';
import { StepExecutionRepository } from './repositories/step_execution_repository';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';
import { StepFactory } from './step/step_factory';
import { WorkflowContextManager } from './workflow_context_manager/workflow_context_manager';
import { WorkflowExecutionRuntimeManager } from './workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowEventLogger } from './workflow_event_logger/workflow_event_logger';
import { WorkflowExecutionState } from './workflow_context_manager/workflow_execution_state';
import type {
  ResumeWorkflowExecutionParams,
  StartWorkflowExecutionParams,
} from './workflow_task_manager/types';
import { WorkflowTaskManager } from './workflow_task_manager/workflow_task_manager';
import { workflowExecutionLoop } from './workflow_execution_loop';

export class WorkflowsExecutionEnginePlugin
  implements Plugin<WorkflowsExecutionEnginePluginSetup, WorkflowsExecutionEnginePluginStart>
{
  private readonly logger: Logger;
  private readonly config: WorkflowsExecutionEngineConfig;
  private esClient: Client = new Client({
    node: 'http://localhost:9200', // or your ES URL
    auth: {
      username: 'elastic',
      password: 'changeme',
    },
  });
  private readonly workflowExecutionRepository: WorkflowExecutionRepository;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsExecutionEngineConfig>();
    this.workflowExecutionRepository = new WorkflowExecutionRepository(this.esClient);
  }

  public setup(core: CoreSetup, plugins: WorkflowsExecutionEnginePluginSetupDeps) {
    this.logger.debug('workflows-execution-engine: Setup');
    const esClient = this.esClient;
    const logger = this.logger;
    const config = this.config;

    plugins.taskManager.registerTaskDefinitions({
      'workflow:run': {
        title: 'Run Workflow',
        description: 'Executes a workflow immediately',
        timeout: '5m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }) => {
          const workflowExecutionRepository = this.workflowExecutionRepository;

          return {
            async run() {
              const { workflowRunId } = taskInstance.params as StartWorkflowExecutionParams; // TODO: define type
              const [, pluginsStart] = await core.getStartServices();
              const { actions, taskManager } =
                pluginsStart as WorkflowsExecutionEnginePluginStartDeps;

              const { workflowRuntime, workflowLogger, nodesFactory } = await createContainer(
                workflowRunId,
                actions,
                taskManager,
                esClient,
                logger,
                config,
                workflowExecutionRepository
              );
              await workflowRuntime.start();

              await workflowExecutionLoop(workflowRuntime, workflowLogger, nodesFactory);
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
        createTaskRunner: ({ taskInstance }) => {
          const workflowExecutionRepository = this.workflowExecutionRepository;
          return {
            async run() {
              const { workflowRunId } = taskInstance.params as ResumeWorkflowExecutionParams;
              const [, pluginsStart] = await core.getStartServices();
              const { actions, taskManager } =
                pluginsStart as WorkflowsExecutionEnginePluginStartDeps;

              const { workflowRuntime, workflowLogger, nodesFactory } = await createContainer(
                workflowRunId,
                actions,
                taskManager,
                esClient,
                logger,
                config,
                workflowExecutionRepository
              );
              await workflowRuntime.resume();

              await workflowExecutionLoop(workflowRuntime, workflowLogger, nodesFactory);
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
      context: Record<string, any>
    ) => {
      const workflowExecutionId = generateUuid();
      const workflowCreatedAt = new Date();

      const triggeredBy = context.triggeredBy || 'manual'; // 'manual' or 'scheduled'
      const workflowExecution = {
        id: workflowExecutionId,
        spaceId: context.spaceId,
        workflowId: workflow.id,
        workflowDefinition: workflow.definition,
        context,
        status: ExecutionStatus.PENDING,
        createdAt: workflowCreatedAt.toISOString(),
        createdBy: context.createdBy || '', // TODO: set if available
        lastUpdatedAt: workflowCreatedAt.toISOString(),
        lastUpdatedBy: context.createdBy || '', // TODO: set if available
        triggeredBy, // <-- new field for scheduled workflows
      } as Partial<EsWorkflowExecution>; // EsWorkflowExecution (add triggeredBy to type if needed)
      await this.workflowExecutionRepository.createWorkflowExecution(workflowExecution);
      const taskInstance = {
        id: `workflow:${workflowExecutionId}:${context.triggeredBy}`,
        taskType: 'workflow:run',
        params: {
          workflowExecutionId,
          workflow,
        },
        state: {
          lastRunAt: null,
          lastRunStatus: null,
          lastRunError: null,
        },
        scope: ['workflows'],
        enabled: true,
      };

      await plugins.taskManager.schedule(taskInstance);
      return workflowExecutionId;
    };

    return {
      executeWorkflow,
    };
  }

  public stop() {}
}

async function createContainer(
  workflowRunId: string,
  actionsPlugin: ActionsPluginStartContract,
  taskManagerPlugin: TaskManagerStartContract,
  esClient: Client,
  logger: Logger,
  config: WorkflowsExecutionEngineConfig,
  workflowExecutionRepository: WorkflowExecutionRepository
) {
  const workflowExecution = await workflowExecutionRepository.getWorkflowExecutionById(
    workflowRunId
  );

  if (!workflowExecution) {
    throw new Error(`Workflow execution with ID ${workflowRunId} not found`);
  }

  const workflowExecutionGraph = convertToWorkflowGraph(workflowExecution.workflowDefinition);
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

  const contextManager = new WorkflowContextManager({
    spaceId: workflowExecution.spaceId,
    workflow: workflowExecution.workflowDefinition,
    event: workflowExecution.context.event,
    workflowExecutionGraph,
    workflowExecutionRuntime: workflowRuntime,
  });

  const workflowTaskManager = new WorkflowTaskManager(taskManagerPlugin);

  const nodesFactory = new StepFactory(
    contextManager,
    connectorExecutor,
    workflowRuntime,
    workflowLogger,
    workflowTaskManager
  );

  return {
    workflowRuntime,
    contextManager,
    connectorExecutor,
    workflowLogger,
    taskManagerPlugin,
    workflowExecutionRepository,
    workflowTaskManager,
    nodesFactory,
  };
}
