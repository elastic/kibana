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
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';

import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { TriggerType } from '@kbn/workflows/spec/schema/triggers/trigger_schema';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows/types/latest';

import {
  getWorkflowsConnectorAdapter,
  getConnectorType as getWorkflowsConnectorType,
} from './connectors/workflows';
import { WorkflowsManagementFeatureConfig } from './features';
import { WorkflowTaskScheduler } from './tasks/workflow_task_scheduler';
import type {
  WorkflowsRequestHandlerContext,
  WorkflowsServerPluginSetup,
  WorkflowsServerPluginSetupDeps,
  WorkflowsServerPluginStart,
  WorkflowsServerPluginStartDeps,
} from './types';
import { registerUISettings } from './ui_settings';
import { defineRoutes } from './workflows_management/routes';
import { WorkflowsManagementApi } from './workflows_management/workflows_management_api';
import { WorkflowsService } from './workflows_management/workflows_management_service';
import { stepSchemas } from '../common/step_schemas';
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
  private workflowsService: WorkflowsService | null = null;
  private workflowTaskScheduler: WorkflowTaskScheduler | null = null;
  private api: WorkflowsManagementApi | null = null;
  private spaces?: SpacesServiceStart | null = null;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<WorkflowsServerPluginStartDeps>,
    plugins: WorkflowsServerPluginSetupDeps
  ) {
    this.logger.debug('Workflows Management: Setup');

    registerUISettings(core, plugins);

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

      // Create workflows scheduling service function for per-alert execution
      const getScheduleWorkflowService = async (request: KibanaRequest) => {
        return async (
          workflowId: string,
          spaceId: string,
          inputs: Record<string, unknown>,
          triggeredBy: TriggerType
        ) => {
          if (!this.api) {
            throw new Error('Workflows management API not initialized');
          }

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

          const workflowToSchedule: WorkflowExecutionEngineModel = {
            id: workflow.id,
            name: workflow.name,
            enabled: workflow.enabled,
            definition: workflow.definition,
            yaml: workflow.yaml,
          };

          return this.api.scheduleWorkflow(
            workflowToSchedule,
            spaceId,
            inputs,
            triggeredBy,
            request
          );
        };
      };

      // Register the workflows connector
      plugins.actions.registerType(
        getWorkflowsConnectorType({ getWorkflowsService, getScheduleWorkflowService })
      );

      // Register connector adapter for alerting if available
      if (plugins.alerting) {
        plugins.alerting.registerConnectorAdapter(getWorkflowsConnectorAdapter());
      }
    }

    // Register the workflows management feature and its privileges
    plugins.features?.registerKibanaFeature(WorkflowsManagementFeatureConfig);

    this.logger.debug('Workflows Management: Creating workflows service');

    const getCoreStart = () => core.getStartServices().then(([coreStart]) => coreStart);
    const getPluginsStart = () => core.getStartServices().then(([, pluginsStart]) => pluginsStart);
    const getWorkflowExecutionEngine = () =>
      getPluginsStart().then(({ workflowsExecutionEngine }) => workflowsExecutionEngine);

    this.workflowsService = new WorkflowsService(this.logger, getCoreStart, getPluginsStart);

    this.api = new WorkflowsManagementApi(this.workflowsService, getWorkflowExecutionEngine);
    this.spaces = plugins.spaces?.spacesService;

    if (!this.spaces) {
      throw new Error('Spaces service not initialized');
    }

    this.logger.debug('Workflows Management: Creating router');
    const router = core.http.createRouter<WorkflowsRequestHandlerContext>();

    // Register server side APIs
    defineRoutes(router, this.api, this.logger, this.spaces);

    return {
      management: this.api,
    };
  }

  public start(core: CoreStart, plugins: WorkflowsServerPluginStartDeps) {
    this.logger.debug('Workflows Management: Start');

    stepSchemas.initialize(plugins.workflowsExtensions);

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

    this.logger.debug('Workflows Management: Started');

    return {};
  }

  public stop() {}
}
