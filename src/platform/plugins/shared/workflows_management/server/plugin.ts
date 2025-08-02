/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';

import { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { WorkflowsManagementConfig } from './config';
import {
  WORKFLOWS_EXECUTION_LOGS_INDEX,
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../common';
import { workflowSavedObjectType } from './saved_objects/workflow';
import { SchedulerService } from './scheduler/scheduler_service';
import { createWorkflowTaskRunner } from './tasks/workflow_task_runner';
import { WorkflowTaskScheduler } from './tasks/workflow_task_scheduler';
import type {
  WorkflowsExecutionEnginePluginStartDeps,
  WorkflowsManagementPluginServerDependenciesSetup,
  WorkflowsPluginSetup,
  WorkflowsPluginStart,
} from './types';
import { WorkflowsManagementApi } from './workflows_management/workflows_management_api';
import { defineRoutes } from './workflows_management/workflows_management_routes';
import { WorkflowsService } from './workflows_management/workflows_management_service';
import { registerFeatures } from './features';

export class WorkflowsPlugin implements Plugin<WorkflowsPluginSetup, WorkflowsPluginStart> {
  private readonly logger: Logger;
  private readonly config: WorkflowsManagementConfig;
  private workflowsService: WorkflowsService | null = null;
  private schedulerService: SchedulerService | null = null;
  private workflowTaskScheduler: WorkflowTaskScheduler | null = null;
  private unsecureActionsClient: IUnsecuredActionsClient | null = null;
  private api: WorkflowsManagementApi | null = null;
  // TODO: replace with esClient promise from core

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsManagementConfig>();
  }

  public setup(core: CoreSetup, plugins: WorkflowsManagementPluginServerDependenciesSetup) {
    this.logger.debug('Workflows Management: Setup');

    // Register workflow task definition
    if (plugins.taskManager) {
      plugins.taskManager.registerTaskDefinitions({
        'workflow:scheduled': {
          title: 'Scheduled Workflow Execution',
          description: 'Executes workflows on a scheduled basis',
          timeout: '5m',
          maxAttempts: 3,
          createTaskRunner: ({ taskInstance }) => {
            // Capture the plugin instance in a closure
            const plugin = this;
            // Use a factory pattern to get dependencies when the task runs
            return {
              async run() {
                // Get dependencies when the task actually runs
                const [, pluginsStart] = await core.getStartServices();

                // Create the actual task runner with dependencies
                const taskRunner = createWorkflowTaskRunner({
                  logger: plugin.logger,
                  workflowsService: plugin.workflowsService!,
                  workflowsExecutionEngine: (pluginsStart as any).workflowsExecutionEngine,
                  actionsClient: plugin.unsecureActionsClient!,
                })({ taskInstance });

                return taskRunner.run();
              },
              async cancel() {
                // Cancel function for the task
              },
            };
          },
        },
      });

      plugins.taskManager.registerTaskDefinitions({
        'workflow:run': {
          title: 'Run Workflow',
          description: 'Executes a workflow immediately',
          timeout: '5m',
          maxAttempts: 1,
          createTaskRunner: ({ taskInstance }) => {
            return {
              async run() {
                // Get dependencies when the task actually runs
                const [, pluginsStart] = await core.getStartServices();
                const { workflowsExecutionEngine } =
                  pluginsStart as WorkflowsExecutionEnginePluginStartDeps;

                return workflowsExecutionEngine.executeWorkflow(
                  taskInstance.params.workflow,
                  taskInstance.params.context
                );
              },
              async cancel() {
                // Cancel function for the task
              },
            };
          },
        },
      });
    }

    // Register saved object types
    core.savedObjects.registerType(workflowSavedObjectType);

    registerFeatures(plugins);

    this.logger.debug('Workflows Management: Creating router');
    const router = core.http.createRouter();

    this.logger.debug('Workflows Management: Creating workflows service');

    // Get ES client from core
    const esClientPromise = core
      .getStartServices()
      .then(([coreStart]) => coreStart.elasticsearch.client.asInternalUser);

    // Get saved objects client from core
    const getSavedObjectsClient = () =>
      core
        .getStartServices()
        .then(([coreStart]) => coreStart.savedObjects.createInternalRepository());

    this.workflowsService = new WorkflowsService(
      esClientPromise,
      this.logger,
      getSavedObjectsClient,
      WORKFLOWS_EXECUTIONS_INDEX,
      WORKFLOWS_STEP_EXECUTIONS_INDEX,
      WORKFLOWS_EXECUTION_LOGS_INDEX,
      this.config.logging.console
    );
    this.api = new WorkflowsManagementApi(this.workflowsService);

    // Register server side APIs
    defineRoutes(router, this.api, this.logger);

    return {
      management: this.api,
    };
  }

  public start(core: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.info('Workflows Management: Start');

    this.unsecureActionsClient = plugins.actions.getUnsecuredActionsClient();

    // Initialize workflow task scheduler with the start contract
    this.workflowTaskScheduler = new WorkflowTaskScheduler(this.logger, plugins.taskManager);

    // Set task scheduler in workflows service
    if (this.workflowsService) {
      this.workflowsService.setTaskScheduler(this.workflowTaskScheduler);
    }

    const actionsTypes = plugins.actions.getAllTypes();
    this.logger.debug(`Available action types: ${actionsTypes.join(', ')}`);

    this.logger.debug('Workflows Management: Creating scheduler service');
    this.schedulerService = new SchedulerService(
      this.logger,
      this.workflowsService!,
      this.unsecureActionsClient!,
      plugins.taskManager
    );
    this.api!.setSchedulerService(this.schedulerService!);

    this.logger.debug('Workflows Management: Started');

    return {
      // TODO: use api abstraction instead of schedulerService methods directly
      pushEvent: this.schedulerService!.pushEvent.bind(this.schedulerService),
      runWorkflow: this.schedulerService!.runWorkflow.bind(this.schedulerService),
    };
  }

  public stop() {}
}
