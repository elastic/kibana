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
import type { TriggerType } from '@kbn/workflows';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows/types/latest';
import { registerWorkflowAgentBuilderIntegration } from './agent_builder';
import {
  getWorkflowsConnectorAdapter,
  getConnectorType as getWorkflowsConnectorType,
} from './connectors/workflows';
import { validateWorkflowForExecution } from './connectors/workflows/validate_workflow_for_execution';
import {
  resolveMatchingWorkflowSubscriptions,
  type ResolveMatchingWorkflowSubscriptionsParams,
} from './event_driven/resolve_workflow_subscriptions';
import { createTriggerEventHandler } from './event_driven/trigger_event_handler';
import { WorkflowsManagementFeatureConfig } from './features';
import { WorkflowTaskScheduler } from './tasks/workflow_task_scheduler';
import {
  initializeTriggerEventsClient,
  initializeTriggerEventsDataStream,
  type TriggerEventsDataStreamClient,
} from './trigger_events_log';
import type {
  AgentBuilderPluginSetupContract,
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
  private triggerEventsClient: TriggerEventsDataStreamClient | null = null;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<WorkflowsServerPluginStartDeps>,
    plugins: WorkflowsServerPluginSetupDeps
  ) {
    this.logger.debug('Workflows Management: Setup');

    registerUISettings(core, plugins);

    initializeTriggerEventsDataStream(core.dataStreams);

    // Register workflows connector if actions plugin is available
    if (plugins.actions) {
      // Create workflows service function for the connector
      const getWorkflowsService = async (request: KibanaRequest) => {
        // Return a function that will be called by the connector
        return async (workflowId: string, spaceId: string, inputs: Record<string, unknown>) => {
          if (!this.api) {
            throw new Error('Workflows management API not initialized');
          }

          // Get the workflow and validate it is in a runnable state
          const workflow = await this.api.getWorkflow(workflowId, spaceId);
          validateWorkflowForExecution(workflow, workflowId);

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

          // Get the workflow and validate it is in a runnable state
          const workflow = await this.api.getWorkflow(workflowId, spaceId);
          validateWorkflowForExecution(workflow, workflowId);

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
            request,
            triggeredBy
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

    if (!this.api) {
      throw new Error('Workflows management API not initialized');
    }
    const api = this.api;
    const resolveMatchingWorkflowSubscriptionsFn = (
      params: ResolveMatchingWorkflowSubscriptionsParams
    ) => resolveMatchingWorkflowSubscriptions(params, { api, logger: this.logger });

    const triggerEventHandler = createTriggerEventHandler({
      api: this.api,
      logger: this.logger,
      getTriggerEventsClient: () => this.triggerEventsClient,
      getWorkflowExecutionEngine,
      resolveMatchingWorkflowSubscriptions: resolveMatchingWorkflowSubscriptionsFn,
    });

    plugins.workflowsExtensions.registerTriggerEventHandler(triggerEventHandler);

    this.logger.debug('Workflows Management: Creating router');
    const router = core.http.createRouter<WorkflowsRequestHandlerContext>();

    // Register server side APIs
    defineRoutes(router, this.api, this.logger, this.spaces, getWorkflowExecutionEngine);

    void core.plugins
      .onSetup<{ agentBuilder: AgentBuilderPluginSetupContract }>('agentBuilder')
      .then(({ agentBuilder }) => {
        if (agentBuilder.found) {
          this.logger.debug(
            'Workflows Management: Agent Builder found, registering AI integration'
          );
          registerWorkflowAgentBuilderIntegration({
            agentBuilder: agentBuilder.contract,
            logger: this.logger,
            api,
          });
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Workflows Management: Failed to register AI integration with Agent Builder: ${message}`
        );
      });

    return {
      management: api,
    };
  }

  public start(core: CoreStart, plugins: WorkflowsServerPluginStartDeps) {
    this.logger.debug('Workflows Management: Start');

    void this.initializeTriggerEventsClient(core);

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

  private async initializeTriggerEventsClient(core: CoreStart): Promise<void> {
    try {
      this.triggerEventsClient = await initializeTriggerEventsClient(core.dataStreams);
    } catch (error) {
      this.logger.warn(
        `Failed to initialize trigger events data stream client: ${
          error instanceof Error ? error.message : String(error)
        }. Event audit logging will be skipped.`
      );
    }
  }

  public stop() {}
}
