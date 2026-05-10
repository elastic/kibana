/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  AgentContextLayerPluginSetup,
  AgentContextLayerPluginStart,
} from '@kbn/agent-context-layer-plugin/server';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import {
  ENTITY_MONITOR_WORKFLOW_ID,
  WORKFLOWS_MANAGEMENT_HEALTH_CHECK_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { registerWorkflowAgentBuilderIntegration } from './agent_builder';
import { createWorkflowSmlType } from './agent_builder/sml_types/workflow';
import { defineRoutes } from './api/routes';
import { WorkflowsManagementApi } from './api/workflows_management_api';
import { WorkflowsService } from './api/workflows_management_service';
import { AvailabilityUpdater } from './availability';
import {
  createManagedWorkflowsSystemApiProvider,
  createWorkflowsClientProvider,
} from './client/workflows_client';
import type { WorkflowsManagementConfig } from './config';
import {
  getWorkflowsConnectorAdapter,
  getConnectorType as getWorkflowsConnectorType,
} from './connectors/workflows';
import { WorkflowsManagementFeatureConfig } from './features';
import { WorkflowsAiTelemetryClient } from './telemetry/workflows_ai_telemetry_client';
import type {
  AgentBuilderPluginSetup,
  WorkflowsRequestHandlerContext,
  WorkflowsServerPluginSetup,
  WorkflowsServerPluginSetupDeps,
  WorkflowsServerPluginStart,
  WorkflowsServerPluginStartDeps,
} from './types';
import { registerUISettings } from './ui_settings';
import { stepSchemas } from '../common/step_schemas';

const WORKFLOWS_MANAGEMENT_PLUGIN_ID = 'workflowsManagement';

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
  private aiTelemetryClient: WorkflowsAiTelemetryClient | null = null;
  private config: WorkflowsManagementConfig;
  private availabilityUpdater: AvailabilityUpdater | null = null;
  private api: WorkflowsManagementApi | null = null;
  private workflowsService: WorkflowsService | null = null;

  constructor(initializerContext: PluginInitializerContext<WorkflowsManagementConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsManagementConfig>();
  }

  public setup(
    core: CoreSetup<WorkflowsServerPluginStartDeps>,
    plugins: WorkflowsServerPluginSetupDeps
  ) {
    this.logger.debug('Workflows Management: Setup');

    this.aiTelemetryClient = new WorkflowsAiTelemetryClient(core.analytics, this.logger);

    registerUISettings(core, plugins);

    // Register the workflows management feature and its privileges
    plugins.features?.registerKibanaFeature(WorkflowsManagementFeatureConfig);

    this.logger.debug('Workflows Management: Creating workflows service');

    const workflowsService = new WorkflowsService(core.getStartServices, this.logger);
    this.workflowsService = workflowsService;

    const api = new WorkflowsManagementApi(workflowsService, this.config.available);
    this.api = api;

    // Register workflows connector if actions plugin is available
    if (plugins.actions) {
      // Register the workflows connector
      plugins.actions.registerType(getWorkflowsConnectorType(api));

      // Register connector adapter for alerting if available
      if (plugins.alerting) {
        plugins.alerting.registerConnectorAdapter(getWorkflowsConnectorAdapter());
      }
    }

    // Register public workflows client provider to allow any external plugin use it via the workflowsExtensions plugin
    plugins.workflowsExtensions.registerWorkflowsClientProvider(
      createWorkflowsClientProvider(workflowsService, this.config, this.logger)
    );
    plugins.workflowsExtensions.registerManagedWorkflowsSystemApiProvider(
      createManagedWorkflowsSystemApiProvider(workflowsService, this.config, this.logger)
    );
    plugins.workflowsExtensions.registerManagedWorkflowOwner(WORKFLOWS_MANAGEMENT_PLUGIN_ID);

    const spaces = plugins.spaces.spacesService;

    const router = core.http.createRouter<WorkflowsRequestHandlerContext>();
    defineRoutes(router, api, this.logger, spaces, workflowsService);

    this.setupAiIntegration(core, api, this.aiTelemetryClient);

    return {
      management: api,
    };
  }

  public start(core: CoreStart, plugins: WorkflowsServerPluginStartDeps) {
    this.logger.debug('Workflows Management: Start');

    stepSchemas.initialize(plugins.workflowsExtensions);

    if (this.api) {
      this.availabilityUpdater = new AvailabilityUpdater({
        licensing: plugins.licensing,
        config: this.config,
        api: this.api,
        logger: this.logger,
      });
    }

    if (this.workflowsService) {
      const managedWorkflowPluginIds = plugins.workflowsExtensions.getManagedWorkflowPluginIds();
      void this.runManagedWorkflowsStartupReconciliation(managedWorkflowPluginIds);
      void this.initializeManagedWorkflowsOnStart();
    }

    this.logger.debug('Workflows Management: Started');
    return {};
  }

  private setupAiIntegration(
    core: CoreSetup<WorkflowsServerPluginStartDeps>,
    api: WorkflowsManagementApi,
    aiTelemetryClient: WorkflowsAiTelemetryClient
  ): void {
    void core.plugins
      .onSetup<{ agentBuilder: AgentBuilderPluginSetup }>('agentBuilder')
      .then(({ agentBuilder }) => {
        if (agentBuilder.found) {
          this.logger.debug(
            'Workflows Management: Agent Builder found, registering AI integration'
          );
          registerWorkflowAgentBuilderIntegration({
            agentBuilder: agentBuilder.contract,
            logger: this.logger,
            api,
            aiTelemetryClient,
          });
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Workflows Management: Failed to register AI integration with Agent Builder: ${message}`
        );
      });

    void core.plugins
      .onSetup<{
        agentContextLayer: AgentContextLayerPluginSetup;
      }>('agentContextLayer')
      .then(({ agentContextLayer }) => {
        if (agentContextLayer.found) {
          agentContextLayer.contract.registerType(createWorkflowSmlType(api));
          this.logger.debug(
            'Workflows Management: Workflow SML type registered with Agent Context Layer'
          );
        } else {
          this.logger.warn(
            'Workflows Management: agentContextLayer not available — workflow SML type not registered'
          );
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Workflows Management: Failed to register workflow SML type: ${message}`);
      });

    void core.plugins
      .onStart<{ agentContextLayer: AgentContextLayerPluginStart }>('agentContextLayer')
      .then(({ agentContextLayer }) => {
        if (agentContextLayer.found) {
          api.setSmlIndexAttachment(
            agentContextLayer.contract.indexAttachment,
            this.logger.get('sml')
          );
          this.logger.debug(
            'Workflows Management: SML event-driven indexing wired to workflow CRUD'
          );
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Workflows Management: Failed to wire SML indexing with Agent Context Layer: ${message}`
        );
      });
  }

  private async initializeManagedWorkflowsOnStart(): Promise<void> {
    try {
      await this.workflowsService?.installManagedWorkflow(
        WORKFLOWS_MANAGEMENT_HEALTH_CHECK_WORKFLOW_ID,
        {
          isStartupReconcile: true,
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
        },
        WORKFLOWS_MANAGEMENT_PLUGIN_ID
      );
      await this.workflowsService?.installManagedWorkflow(
        ENTITY_MONITOR_WORKFLOW_ID,
        {
          isStartupReconcile: true,
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
          values: {
            entityId: 'default',
          },
        },
        WORKFLOWS_MANAGEMENT_PLUGIN_ID
      );
    } catch (error) {
      this.logger.warn('Workflows Management: Failed to initialize managed workflows on start', {
        error,
      });
    }
  }

  private async runManagedWorkflowsStartupReconciliation(pluginIds: string[]): Promise<void> {
    try {
      await this.workflowsService?.reconcileManagedWorkflowOrphans(pluginIds);
      await this.workflowsService?.reconcileAutoManagedWorkflowUpdates();
    } catch (error) {
      this.logger.warn(
        'Workflows Management: Failed to complete managed workflows startup reconciliation',
        {
          error,
        }
      );
    }
  }

  public stop() {
    this.availabilityUpdater?.stop();
  }
}
