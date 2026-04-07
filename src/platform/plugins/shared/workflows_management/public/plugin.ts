/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject, type Subscription } from 'rxjs';
import { filter, map, pairwise, startWith } from 'rxjs';
import {
  type AppDeepLinkLocations,
  type AppMountParameters,
  AppStatus,
  type AppUpdater,
  type CoreSetup,
  type CoreStart,
  DEFAULT_APP_CATEGORIES,
  type Plugin,
} from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  WORKFLOWS_AI_AGENT_SETTING_ID,
  WORKFLOWS_UI_SETTING_ID,
} from '@kbn/workflows/common/constants';
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

const VisibleIn: AppDeepLinkLocations[] = ['globalSearch', 'home', 'kibanaOverview', 'sideNav'];

export class WorkflowsPlugin
  implements
    Plugin<
      WorkflowsPublicPluginSetup,
      WorkflowsPublicPluginStart,
      WorkflowsPublicPluginSetupDependencies,
      WorkflowsPublicPluginStartDependencies
    >
{
  private appUpdater$: Subject<AppUpdater>;
  private telemetryService: TelemetryService;
  private agentBuilderPromise: Promise<AgentBuilderPluginStartContract | undefined> | undefined;
  private isWorkflowsUiEnabled = false;
  private settingsSubscription?: Subscription;

  constructor() {
    this.appUpdater$ = new Subject<AppUpdater>();
    this.telemetryService = new TelemetryService();
  }

  public setup(
    core: CoreSetup<WorkflowsPublicPluginStartDependencies, WorkflowsPublicPluginStart>,
    plugins: WorkflowsPublicPluginSetupDependencies
  ): WorkflowsPublicPluginSetup {
    // Initialize telemetry service
    this.telemetryService.setup({ analytics: core.analytics });

    // Check if workflows UI is enabled
    this.isWorkflowsUiEnabled = core.uiSettings.get<boolean>(WORKFLOWS_UI_SETTING_ID, false);

    /* **************************************************************************************************************************** */
    /* WARNING: DO NOT ADD ANYTHING ABOVE THIS LINE, which can expose workflows UI to users who don't have the feature flag enabled */
    /* **************************************************************************************************************************** */
    // Return early if workflows UI is not enabled, do not register the connector type and UI
    if (!this.isWorkflowsUiEnabled) {
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
      visibleIn: VisibleIn,
      category: DEFAULT_APP_CATEGORIES.management,
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

    // License check to set app status
    plugins.licensing.license$.subscribe((license) => {
      if (license.isActive && license.hasAtLeast('enterprise')) {
        this.appUpdater$.next(() => ({ status: AppStatus.accessible, visibleIn: VisibleIn }));
      } else {
        this.appUpdater$.next(() => ({ status: AppStatus.inaccessible, visibleIn: [] }));
      }
    });

    this.subscribeToWorkflowsSettingChange(core);

    return {};
  }

  public stop() {
    this.settingsSubscription?.unsubscribe();
  }

  /**
   * When the user disables workflows via Advanced Settings, bulk-disable all
   * active workflows before the page reloads (requiresPageReload is set).
   */
  private subscribeToWorkflowsSettingChange(core: CoreStart): void {
    this.settingsSubscription = core.settings.client
      .getUpdate$()
      .pipe(
        filter(({ key }) => key === WORKFLOWS_UI_SETTING_ID),
        map(({ newValue }) => newValue as boolean),
        startWith(this.isWorkflowsUiEnabled),
        pairwise(),
        filter(([prev, curr]) => prev === true && curr === false)
      )
      .subscribe(() => {
        core.http
          .post('/internal/workflows/disable_all_workflows', { version: '1' })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error('Failed to disable all workflows on opt-out:', err);
          });
      });
  }

  /**
   * Sets up AI authoring features: resolves the Agent Builder contract and
   * registers workflow attachment renderers. Eagerly kicks off the dynamic
   * import so the chunk downloads in parallel with onStart resolution,
   * minimising the window where renderers are not yet registered.
   */
  private setupAiIntegration(
    core: CoreSetup<WorkflowsPublicPluginStartDependencies, WorkflowsPublicPluginStart>
  ): void {
    const isAiAgentEnabled = core.uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID, false);
    if (!isAiAgentEnabled) {
      return;
    }

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
