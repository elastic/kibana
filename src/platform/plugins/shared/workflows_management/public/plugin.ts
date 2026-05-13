/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter, Subject, type Subscription } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type {
  AppDeepLinkLocations,
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { Logger } from '@kbn/logging';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows/common/constants';
import { getWorkflowsCapabilities } from '@kbn/workflows-ui';
import { AvailabilityService } from './common/lib/availability';
import { TelemetryService } from './common/lib/telemetry/telemetry_service';
import type { WorkflowsBaseTelemetry } from './common/service/telemetry';
import { triggerSchemas } from './trigger_schemas';
import type {
  WorkflowsPublicPluginSetup,
  WorkflowsPublicPluginSetupDependencies,
  WorkflowsPublicPluginStart,
  WorkflowsPublicPluginStartAdditionalServices,
  WorkflowsPublicPluginStartDependencies,
  WorkflowsServices,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { stepSchemas } from '../common/step_schemas';

export class WorkflowsPlugin
  implements
    Plugin<
      WorkflowsPublicPluginSetup,
      WorkflowsPublicPluginStart,
      WorkflowsPublicPluginSetupDependencies,
      WorkflowsPublicPluginStartDependencies
    >
{
  private logger: Logger;
  private appUpdater$: Subject<AppUpdater>;
  private telemetryService: TelemetryService;
  private cachedTelemetry: WorkflowsBaseTelemetry | null = null;
  private availabilityService: AvailabilityService;
  private agentBuilderPromise: Promise<AgentBuilderPluginStart | undefined> | undefined;
  private settingsSubscription?: Subscription;
  private appVisibilitySubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('WorkflowsManagement');
    this.appUpdater$ = new Subject<AppUpdater>();
    this.telemetryService = new TelemetryService();
    this.availabilityService = new AvailabilityService();
  }

  public setup(
    core: CoreSetup<WorkflowsPublicPluginStartDependencies, WorkflowsPublicPluginStart>,
    plugins: WorkflowsPublicPluginSetupDependencies
  ): WorkflowsPublicPluginSetup {
    // Initialize telemetry service
    this.telemetryService.setup({ analytics: core.analytics });

    // Check if workflows UI is enabled
    const isWorkflowsUiEnabled = core.uiSettings.get<boolean>(WORKFLOWS_UI_SETTING_ID, true);
    /* **************************************************************************************************************************** */
    /* WARNING: DO NOT ADD ANYTHING ABOVE THIS LINE, which can expose workflows UI to users who don't have the feature flag enabled */
    /* **************************************************************************************************************************** */
    // Return early if workflows UI is not enabled, do not register the connector type and UI
    if (!isWorkflowsUiEnabled) {
      return {};
    }

    // Register workflows connector UI component lazily to reduce main bundle size
    const registerConnectorType = async () => {
      const { getWorkflowsConnectorType } = await import('./connectors/workflows');
      plugins.triggersActionsUi.actionTypeRegistry.register(getWorkflowsConnectorType());
    };

    registerConnectorType();

    this.setupAgentBuilderStart(core);

    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      appRoute: '/app/workflows',
      euiIconType: 'workflowsApp',
      visibleIn: this.getVisibleIn({ isAuthorized: true, isAvailable: true }),
      category: DEFAULT_APP_CATEGORIES.management, // Only for the classic navigation
      order: 9015,
      updater$: this.appUpdater$,
      mount: async (params: AppMountParameters) => {
        // Load application bundle
        const { renderApp } = await import('./application');
        const services = await this.createWorkflowsStartServices(core);

        return renderApp(services, params);
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    plugins: WorkflowsPublicPluginStartDependencies
  ): WorkflowsPublicPluginStart {
    // Initialize singletons with workflowsExtensions
    stepSchemas.initialize(plugins.workflowsExtensions);
    triggerSchemas.initialize(plugins.workflowsExtensions);

    this.subscribeToWorkflowsSettingChange(core);

    // Availability service: set license and subscribe to availability for app visibility changes
    this.availabilityService.setLicense$(plugins.licensing.license$);

    this.subscribeAppVisibilityChanges(core);

    return {
      setUnavailableInServerlessTier: (options) => {
        this.availabilityService.setUnavailableInServerlessTier(options.requiredProducts);
      },
      getTelemetry: async () => {
        if (!this.cachedTelemetry) {
          const { WorkflowsBaseTelemetry } = await import('./common/service/telemetry');
          this.cachedTelemetry = new WorkflowsBaseTelemetry(this.telemetryService.getClient());
        }
        return this.cachedTelemetry;
      },
      getQueryClient: async () => {
        const { queryClient } = await import('./shared/lib/query_client');
        return queryClient;
      },
    };
  }

  public stop() {
    this.settingsSubscription?.unsubscribe();
    this.appVisibilitySubscription?.unsubscribe();
    this.availabilityService.stop();
  }

  /**
   * When the user disables workflows via Advanced Settings, bulk-disable all
   * active workflows before the page reloads (requiresPageReload is set).
   */
  private subscribeToWorkflowsSettingChange(core: CoreStart): void {
    this.settingsSubscription = core.settings.client
      .getUpdate$()
      .pipe(
        filter(({ key, oldValue, newValue }) => {
          return key === WORKFLOWS_UI_SETTING_ID && oldValue === true && newValue === false;
        })
      )
      .subscribe(() => {
        core.http.post('/internal/workflows/disable', { version: '1' }).catch((err) => {
          this.logger.error('Failed to disable all workflows on opt-out', { error: err });
        });
      });
  }

  /**
   * Subscribes to the availability change and updates the application visibility accordingly.
   * @param core - The core start services.
   */
  private subscribeAppVisibilityChanges(core: CoreStart): void {
    const capabilities = getWorkflowsCapabilities(core.application.capabilities);
    const isAuthorized = capabilities.canReadWorkflow; // Read privilege is the minimum privilege required

    this.appVisibilitySubscription = this.availabilityService
      .getIsAvailable$()
      .subscribe((isAvailable) => {
        this.appUpdater$.next(() => ({
          visibleIn: this.getVisibleIn({ isAuthorized, isAvailable }),
        }));
      });
  }

  /**
   * Returns the visible locations for the workflows application based on the user's capabilities and availability.
   * @param isAuthorized - Whether the user is authorized to access workflows UI.
   * @param isAvailable - Whether the workflows application is available (license / tier).
   * @returns The visible locations for the workflows application.
   */
  private getVisibleIn(params: {
    isAuthorized: boolean;
    isAvailable: boolean;
  }): AppDeepLinkLocations[] {
    // Not available takes precedence over authorized.
    if (!params.isAvailable) {
      // Remove generic locations, but keep in sideNav and globalSearch to make users aware of the feature.
      return ['globalSearch', 'sideNav'];
    }
    if (!params.isAuthorized) {
      // Remove from sideNav so it does not use nav real estate, but keep in globalSearch to make it discoverable
      return ['globalSearch'];
    }
    return ['globalSearch', 'home', 'kibanaOverview', 'sideNav'];
  }

  /**
   * Wires the agentBuilder start contract through `agentBuilderPromise` so the
   * workflow YAML editor's `use_agent_builder_integration` hook can consume it via
   * Kibana services. Renderer registration is handled by the agentBuilderWorkflows
   * plugin.
   */
  private setupAgentBuilderStart(
    core: CoreSetup<WorkflowsPublicPluginStartDependencies, WorkflowsPublicPluginStart>
  ): void {
    // `core.plugins.onStart` throws synchronously when the named plugin is not in the
    // current build's dependency map — which happens when `agentBuilder` is disabled
    // for the running solution/tier (e.g. serverless security essentials sets
    // `xpack.agentBuilder.enabled: false`). The synchronous throw bypasses the
    // promise `.catch`, so we wrap the call in try/catch and fall back to undefined.
    try {
      this.agentBuilderPromise = core.plugins
        .onStart<{ agentBuilder: AgentBuilderPluginStart }>('agentBuilder')
        .then(({ agentBuilder }) => (agentBuilder.found ? agentBuilder.contract : undefined))
        .catch(() => undefined);
    } catch {
      this.agentBuilderPromise = Promise.resolve(undefined);
    }
  }

  /** Creates the start services to be used in the Kibana services context of the workflows application */
  private async createWorkflowsStartServices(
    core: CoreSetup<WorkflowsPublicPluginStartDependencies, WorkflowsPublicPluginStart>
  ): Promise<WorkflowsServices> {
    // Get start services as specified in kibana.jsonc
    const [coreStart, depsStart] = await core.getStartServices();

    const agentBuilder = await this.agentBuilderPromise;

    const additionalServices: WorkflowsPublicPluginStartAdditionalServices = {
      storage: new Storage(localStorage),
      workflowsManagement: {
        availability: this.availabilityService,
        telemetry: this.telemetryService.getClient(),
        agentBuilder,
      },
    };

    // Make sure the workflows extensions registries are ready before using the services
    await depsStart.workflowsExtensions.isReady();

    return {
      ...coreStart,
      ...depsStart,
      ...additionalServices,
    };
  }
}
