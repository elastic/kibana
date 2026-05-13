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
import { defineRoutes } from './api/routes';
import { WorkflowsManagementApi } from './api/workflows_management_api';
import { WorkflowsService } from './api/workflows_management_service';
import { AvailabilityUpdater } from './availability';
import { createWorkflowsClientProvider } from './client/workflows_client';
import type { WorkflowsManagementConfig } from './config';
import {
  getWorkflowsConnectorAdapter,
  getConnectorType as getWorkflowsConnectorType,
} from './connectors/workflows';
import { WorkflowsManagementFeatureConfig } from './features';
import { createWorkflowsInboxProvider } from './inbox/workflows_inbox_provider';
import { migrateLegacyAnonymizationSettings } from './seeding/migrate_anonymization_settings';
import { seedDefaultWorkflows } from './seeding/seed_default_workflows';
import type {
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

    registerUISettings(core, plugins);

    plugins.features?.registerKibanaFeature(WorkflowsManagementFeatureConfig);

    this.logger.debug('Workflows Management: Creating workflows service');

    const workflowsService = new WorkflowsService(core.getStartServices, this.logger);
    this.workflowsService = workflowsService;

    const api = new WorkflowsManagementApi(workflowsService, this.config.available);
    this.api = api;

    if (plugins.actions) {
      plugins.actions.registerType(getWorkflowsConnectorType(api));

      if (plugins.alerting) {
        plugins.alerting.registerConnectorAdapter(getWorkflowsConnectorAdapter());
      }
    }

    const spaces = plugins.spaces.spacesService;

    plugins.workflowsExtensions.registerWorkflowsClientProvider(
      createWorkflowsClientProvider(workflowsService, this.config, this.logger, spaces)
    );

    const router = core.http.createRouter<WorkflowsRequestHandlerContext>();
    defineRoutes(router, api, this.logger, spaces, workflowsService);

    if (plugins.inbox) {
      this.logger.debug('Workflows Management: registering inbox provider');
      plugins.inbox.registerActionProvider(
        createWorkflowsInboxProvider({ api, logger: this.logger })
      );
    }

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

    if (plugins.inferenceWorkflows && this.workflowsService) {
      const defaultWorkflows = plugins.inferenceWorkflows.getDefaultWorkflows();
      const service = this.workflowsService;
      const logger = this.logger;
      void (async () => {
        try {
          const storage = await service.getWorkflowStorage();
          await seedDefaultWorkflows(storage, defaultWorkflows, logger);
          await migrateLegacyAnonymizationSettings(core, storage, logger);
        } catch (err) {
          logger.warn(
            `Failed during default workflow seeding or migration: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      })();
    }

    this.logger.debug('Workflows Management: Started');
    return {};
  }

  public stop() {
    this.availabilityUpdater?.stop();
  }
}
