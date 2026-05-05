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
import { registerWorkflowAgentBuilderIntegration } from './agent_builder';
import { defineRoutes } from './api/routes';
import { type SmlIndexAttachmentFn, WorkflowsManagementApi } from './api/workflows_management_api';
import { WorkflowsService } from './api/workflows_management_service';
import { AvailabilityUpdater } from './availability';
import { createWorkflowsClientProvider } from './client/workflows_client';
import type { WorkflowsManagementConfig } from './config';
import {
  getWorkflowsConnectorAdapter,
  getConnectorType as getWorkflowsConnectorType,
} from './connectors/workflows';
import { WorkflowsManagementFeatureConfig } from './features';
import { WorkflowsAiTelemetryClient } from './telemetry/workflows_ai_telemetry_client';
import type {
  AgentBuilderPluginSetupContract,
  WorkflowsRequestHandlerContext,
  WorkflowsServerPluginSetup,
  WorkflowsServerPluginSetupDeps,
  WorkflowsServerPluginStart,
  WorkflowsServerPluginStartDeps,
} from './types';
import { registerUISettings } from './ui_settings';
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
  private aiTelemetryClient: WorkflowsAiTelemetryClient | null = null;
  private config: WorkflowsManagementConfig;
  private availabilityUpdater: AvailabilityUpdater | null = null;
  private api: WorkflowsManagementApi | null = null;

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

    this.logger.debug('Workflows Management: Started');
    return {};
  }

  private setupAiIntegration(
    core: CoreSetup<WorkflowsServerPluginStartDeps>,
    api: WorkflowsManagementApi,
    aiTelemetryClient: WorkflowsAiTelemetryClient
  ): void {
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
      .onStart<{ agentBuilder: { sml: { indexAttachment: SmlIndexAttachmentFn } } }>('agentBuilder')
      .then(({ agentBuilder }) => {
        if (agentBuilder.found) {
          api.setSmlIndexAttachment(
            agentBuilder.contract.sml.indexAttachment,
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
          `Workflows Management: Failed to wire SML indexing with Agent Builder: ${message}`
        );
      });
  }

  public stop() {
    this.availabilityUpdater?.stop();
  }
}
