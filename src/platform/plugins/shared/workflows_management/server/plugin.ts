/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-this-alias, @typescript-eslint/no-non-null-assertion */

import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';

import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows/types/latest';
import type { WorkflowsManagementConfig } from './config';

import {
  getWorkflowsConnectorAdapter,
  getConnectorType as getWorkflowsConnectorType,
} from './connectors/workflows';
import { WorkflowsManagementFeatureConfig } from './features';
import { createWorkflowTaskRunner } from './tasks/workflow_task_runner';
import { WorkflowTaskScheduler } from './tasks/workflow_task_scheduler';
import type {
  WorkflowsServerPluginSetup,
  WorkflowsServerPluginSetupDeps,
  WorkflowsServerPluginStart,
  WorkflowsServerPluginStartDeps,
} from './types';
import { registerUISettings } from './ui_settings';
import { defineRoutes } from './workflows_management/routes';
import { WorkflowsManagementApi } from './workflows_management/workflows_management_api';
import { WorkflowsService } from './workflows_management/workflows_management_service';
// Import the workflows connector

export class WorkflowsPlugin
  implements
    Plugin<
      WorkflowsServerPluginSetup,
      WorkflowsServerPluginStart,
      WorkflowsServerPluginSetupDeps,
      WorkflowsServerPluginStartDeps
    >
{
  private readonly logger: Logger;
  private readonly config: WorkflowsManagementConfig;
  private workflowsService: WorkflowsService | null = null;
  private workflowTaskScheduler: WorkflowTaskScheduler | null = null;
  private unsecureActionsClient: IUnsecuredActionsClient | null = null;
  private api: WorkflowsManagementApi | null = null;
  private spaces?: SpacesServiceStart | null = null;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsManagementConfig>();
  }

  public setup(
    core: CoreSetup<WorkflowsServerPluginStartDeps>,
    plugins: WorkflowsServerPluginSetupDeps
  ) {
    this.logger.debug('Workflows Management: Setup');

    registerUISettings({ uiSettings: core.uiSettings });

    // Register workflows connector if actions plugin is available
    if (plugins.actions) {
      // Create workflows service function for the connector
      const getWorkflowsService = async (request: KibanaRequest) => {
        // Return a function that will be called by the connector
        return async (workflowId: string, spaceId: string, inputs: Record<string, unknown>) => {
          if (!this.api) {
            throw new Error('Workflows management API not initialized');
          }

          // Get the workflow first
          const workflow = await this.api.getWorkflow(workflowId, spaceId);
          if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
          }

          if (!workflow.definition) {
            throw new Error(`Workflow definition not found: ${workflowId}`);
          }

          if (!workflow.valid) {
            throw new Error(`Workflow is not valid: ${workflowId}`);
          }

          const workflowToRun: WorkflowExecutionEngineModel = {
            id: workflow.id,
            name: workflow.name,
            enabled: workflow.enabled,
            definition: workflow.definition,
            yaml: workflow.yaml,
          };

          // Run the workflow, @tb: maybe switch to scheduler?
          return this.api.runWorkflow(workflowToRun, spaceId, inputs, request);
        };
      };

      // Register the workflows connector
      plugins.actions.registerType(getWorkflowsConnectorType({ getWorkflowsService }));

      // Register connector adapter for alerting if available
      if (plugins.alerting) {
        plugins.alerting.registerConnectorAdapter(getWorkflowsConnectorAdapter());
      }
    }

    // Register workflow task definition
    if (plugins.taskManager) {
      plugins.taskManager.registerTaskDefinitions({
        'workflow:scheduled': {
          title: 'Scheduled Workflow Execution',
          description: 'Executes workflows on a scheduled basis',
          // Set high timeout for long-running workflows.
          // This is high value to allow long-running workflows.
          // The workflow timeout logic defined in workflow execution engine logic is the primary control.
          timeout: '365d',
          maxAttempts: 3,
          createTaskRunner: ({ taskInstance, fakeRequest }) => {
            // Capture the plugin instance in a closure
            const pluginInstance = this;
            // Use a factory pattern to get dependencies when the task runs
            return {
              async run() {
                // Get dependencies when the task actually runs
                const [, pluginsStart] = await core.getStartServices();

                // Create the actual task runner with dependencies
                const taskRunner = createWorkflowTaskRunner({
                  logger: pluginInstance.logger,
                  workflowsService: pluginInstance.workflowsService!,
                  workflowsExecutionEngine: pluginsStart.workflowsExecutionEngine,
                  actionsClient: pluginInstance.unsecureActionsClient!,
                })({ taskInstance, fakeRequest });

                return taskRunner.run();
              },
              async cancel() {
                // Cancel function for the task
              },
            };
          },
        },
      });
    }

    // Register the workflows management feature and its privileges
    plugins.features?.registerKibanaFeature(WorkflowsManagementFeatureConfig);

    this.logger.debug('Workflows Management: Creating router');
    const router = core.http.createRouter();

    this.logger.debug('Workflows Management: Creating workflows service');

    // Get ES client from core
    const esClientPromise = core
      .getStartServices()
      .then(([coreStart]) => coreStart.elasticsearch.client.asInternalUser);

    const getWorkflowExecutionEngine = () =>
      core.getStartServices().then(([, pluginsStart]) => pluginsStart.workflowsExecutionEngine);

    // Create function to get actions client (available after start)
    const getActionsStart = () =>
      core.getStartServices().then(([, pluginsStart]) => pluginsStart.actions);

    this.workflowsService = new WorkflowsService(
      esClientPromise,
      this.logger,
      this.config.logging.console,
      getActionsStart
    );
    this.api = new WorkflowsManagementApi(this.workflowsService, getWorkflowExecutionEngine);
    this.spaces = plugins.spaces?.spacesService;

    // Register server side APIs
    defineRoutes(router, this.api, this.logger, this.spaces!);

    return {
      management: this.api,
    };
  }

  public start(core: CoreStart, plugins: WorkflowsServerPluginStartDeps) {
    this.logger.info('Workflows Management: Start');

    this.unsecureActionsClient = plugins.actions.getUnsecuredActionsClient();

    // Initialize workflow task scheduler with the start contract
    this.workflowTaskScheduler = new WorkflowTaskScheduler(this.logger, plugins.taskManager);

    // Set task scheduler and security service in workflows service
    if (this.workflowsService) {
      this.workflowsService.setTaskScheduler(this.workflowTaskScheduler);
      if (plugins.security) {
        this.workflowsService.setSecurityService(core.security);
      }
    }

    const actionsTypes = plugins.actions.getAllTypes();
    this.logger.debug(`Available action types: ${actionsTypes.join(', ')}`);

    this.logger.info('Workflows Management: Started');

    return {};
  }

  public stop() {}
}
