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
import { WorkflowManagementAuditLog } from './api/routes/utils/workflow_audit_logging';
import { WorkflowsManagementApi } from './api/workflows_management_api';
import { WorkflowsService } from './api/workflows_management_service';
<<<<<<< HEAD
import { AvailabilityUpdater } from './availability';
import {
  createManagedWorkflowsSystemApiProvider,
  createWorkflowsClientProvider,
} from './client/workflows_client';
=======
>>>>>>> 9.4
import type { WorkflowsManagementConfig } from './config';
import {
  getWorkflowsConnectorAdapter,
  getConnectorType as getWorkflowsConnectorType,
} from './connectors/workflows';
import { WorkflowsManagementFeatureConfig } from './features';
import { createWorkflowsInboxProvider } from './inbox/workflows_inbox_provider';
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
  private readonly kibanaVersion: string;
  private availabilityUpdater: AvailabilityUpdater | null = null;
  private api: WorkflowsManagementApi | null = null;
<<<<<<< HEAD
  private workflowsService: WorkflowsService | null = null;

  constructor(initializerContext: PluginInitializerContext<WorkflowsManagementConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsManagementConfig>();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
=======
  private spaces?: SpacesServiceStart | null = null;
  private securityStart?: SecurityServiceStart;
  private triggerEventsClient: TriggerEventsDataStreamClient | null = null;
  private analytics?: AnalyticsServiceStart;
  private aiTelemetryClient: WorkflowsAiTelemetryClient | null = null;
  private config: WorkflowsManagementConfig;

  constructor(initializerContext: PluginInitializerContext<WorkflowsManagementConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
>>>>>>> 9.4
  }

  public setup(
    core: CoreSetup<WorkflowsServerPluginStartDeps>,
    plugins: WorkflowsServerPluginSetupDeps
  ) {
    this.logger.debug('Workflows Management: Setup');

    registerUISettings(core, plugins);

    plugins.features?.registerKibanaFeature(WorkflowsManagementFeatureConfig);

    this.logger.debug('Workflows Management: Creating workflows service');

    const workflowsService = new WorkflowsService(
      core.getStartServices,
      this.logger,
      this.kibanaVersion
    );
    this.workflowsService = workflowsService;

    const api = new WorkflowsManagementApi(workflowsService, this.config.available);
    this.api = api;

    if (plugins.actions) {
      plugins.actions.registerType(getWorkflowsConnectorType(api));

      if (plugins.alerting) {
        plugins.alerting.registerConnectorAdapter(getWorkflowsConnectorAdapter());
      }
    }

<<<<<<< HEAD
    plugins.workflowsExtensions.registerWorkflowsClientProvider(
      createWorkflowsClientProvider(workflowsService, this.config, this.logger)
    );
    plugins.workflowsExtensions.registerManagedWorkflowsSystemApiProvider(
      createManagedWorkflowsSystemApiProvider(workflowsService, this.config, this.logger)
    );
=======
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
    const telemetryClient = new WorkflowsManagementTelemetryClient({
      logger: this.logger,
      getAnalytics: () => this.analytics,
    });

    const triggerEventHandler = createTriggerEventHandler({
      api: this.api,
      logger: this.logger,
      telemetryClient,
      getTriggerEventsClient: () => this.triggerEventsClient,
      getWorkflowExecutionEngine,
      resolveMatchingWorkflowSubscriptions: resolveMatchingWorkflowSubscriptionsFn,
    });

    plugins.workflowsExtensions.registerTriggerEventHandler(triggerEventHandler);

    this.logger.debug('Workflows Management: Creating router');
    const router = core.http.createRouter<WorkflowsRequestHandlerContext>();

    if (this.config.available) {
      // Register server side APIs only when the plugin is available (only set to false in serverless)
      // TODO: improve this logic and define all the routes but respond with a 403 when the plugin is not available
      defineRoutes(
        router,
        this.api,
        this.logger,
        this.spaces,
        getWorkflowExecutionEngine,
        () => this.securityStart
      );
    }
>>>>>>> 9.4

    const spaces = plugins.spaces.spacesService;

    const router = core.http.createRouter<WorkflowsRequestHandlerContext>();
    const audit = new WorkflowManagementAuditLog({ service: workflowsService });
    defineRoutes(router, api, this.logger, spaces, workflowsService, audit);

    if (plugins.inbox) {
      this.logger.debug('Workflows Management: registering inbox provider');
      plugins.inbox.registerActionProvider(
        createWorkflowsInboxProvider({ api, logger: this.logger, audit })
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

    if (this.workflowsService) {
      // Managed workflow owners register through workflows_extensions because owner
      // plugins cannot depend on workflows_management. Pass the setup-time owner
      // snapshot into workflows_management for storage reconciliation.
      const registeredOwnerPluginIds = plugins.workflowsExtensions.getManagedWorkflowPluginIds();
      // Safe to run in the background: this cleanup only removes docs for owners
      // missing from the setup-time registry, so it cannot race valid start installs.
      void this.runGlobalOrphanCleanup(registeredOwnerPluginIds);
    }

    this.logger.debug('Workflows Management: Started');

    return {};
  }

  private async runGlobalOrphanCleanup(registeredOwnerPluginIds: string[]): Promise<void> {
    try {
      await this.workflowsService?.cleanupUnregisteredOrphans(registeredOwnerPluginIds);
    } catch (error) {
      this.logger.warn(
        'Workflows Management: Failed to complete global orphan cleanup for unregistered workflows',
        { error }
      );
    }
  }

  public stop() {
    this.availabilityUpdater?.stop();
  }
}
