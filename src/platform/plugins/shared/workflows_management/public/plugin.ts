/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { filter, first, Subject, type Subscription } from 'rxjs';
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
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows/common/constants';
import { getWorkflowsCapabilities } from '@kbn/workflows-ui';
import { AvailabilityService } from './common/lib/availability';
import { TelemetryService } from './common/lib/telemetry/telemetry_service';
import { triggerSchemas } from './trigger_schemas';
import type {
  AgentBuilderPluginStartContract,
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
  private availabilityService: AvailabilityService;
  private agentBuilderPromise: Promise<AgentBuilderPluginStartContract | undefined> | undefined;
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

    this.setupAiIntegration(core);

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
   * Sets up AI authoring features: subscribes to `agentBuilder:experimentalFeatures`
   * reactively via `get$` so that toggling the setting registers renderers without
   * a page reload. Once registered, renderers stay (addAttachmentType is idempotent-safe
   * via the guard flag) — this is fine because the server-side tools independently gate
   * on the same setting and won't create attachments when it's off.
   */
  private setupAiIntegration(
    core: CoreSetup<WorkflowsPublicPluginStartDependencies, WorkflowsPublicPluginStart>
  ): void {
    const register = async () => {
      const aiIntegrationModule = import('./features/ai_integration');

      this.agentBuilderPromise = core.plugins
        .onStart<{ agentBuilder: AgentBuilderPluginStartContract }>('agentBuilder')
        .then(async ({ agentBuilder }) => {
          if (agentBuilder.found) {
            const [coreStart] = await core.getStartServices();
            const { registerWorkflowAttachmentRenderers } = await aiIntegrationModule;
            registerWorkflowAttachmentRenderers(agentBuilder.contract.attachments, {
              core: coreStart,
              telemetry: this.telemetryService.getClient(),
            });
            return agentBuilder.contract;
          }
          return undefined;
        })
        .catch(() => undefined);
    };

    core.uiSettings
      .get$<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID)
      .pipe(first((enabled) => enabled))
      .subscribe(() => register());
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
