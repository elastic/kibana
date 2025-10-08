/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_APP_CATEGORIES,
  type AppMountParameters,
  type CoreSetup,
  type CoreStart,
  type Plugin,
} from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows/common/constants';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
// Lazy import to avoid bundling connector dependencies in main plugin
import type {
  WorkflowsPluginSetup,
  WorkflowsPluginSetupDependencies,
  WorkflowsPluginStart,
  WorkflowsPluginStartAdditionalServices,
  WorkflowsPluginStartDependencies,
  WorkflowsServices,
} from './types';

export class WorkflowsPlugin
  implements
    Plugin<
      WorkflowsPluginSetup,
      WorkflowsPluginStart,
      WorkflowsPluginSetupDependencies,
      WorkflowsPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<WorkflowsPluginStartDependencies, WorkflowsPluginStart>,
    plugins: WorkflowsPluginSetupDependencies
  ): WorkflowsPluginSetup {
    // Register workflows connector UI component lazily to reduce main bundle size
    const registerConnectorType = async () => {
      const { getWorkflowsConnectorType } = await import('./connectors/workflows');
      plugins.triggersActionsUi.actionTypeRegistry.register(getWorkflowsConnectorType());
    };

    // Register the connector type immediately but load it lazily
    registerConnectorType();

    // Check if workflows UI is enabled
    const isWorkflowsUiEnabled = core.uiSettings.get<boolean>(WORKFLOWS_UI_SETTING_ID, false);

    if (isWorkflowsUiEnabled) {
      core.application.register({
        id: PLUGIN_ID,
        title: PLUGIN_NAME,
        appRoute: '/app/workflows',
        euiIconType: 'merge', // TODO: use "workflowsAll" when available
        visibleIn: ['globalSearch', 'home', 'kibanaOverview', 'sideNav'],
        category: DEFAULT_APP_CATEGORIES.management,
        order: 9015,
        mount: async (params: AppMountParameters) => {
          // Load application bundle
          const { renderApp } = await import('./application');
          const services = await this.createWorkflowsStartServices(core);

          // Set badge for classic navbar
          services.chrome.setBadge({
            text: 'Technical preview',
            tooltip:
              'This functionality is in technical preview. It may change or be removed in a future release.',
            iconType: 'beaker',
          });

          return renderApp(services, params);
        },
      });
    }

    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart): WorkflowsPluginStart {
    return {};
  }

  public stop() {}

  /** Creates the start services to be used in the Kibana services context of the workflows application */
  private async createWorkflowsStartServices(
    core: CoreSetup<WorkflowsPluginStartDependencies, WorkflowsPluginStart>
  ): Promise<WorkflowsServices> {
    // Get start services as specified in kibana.jsonc
    const [coreStart, depsStart] = await core.getStartServices();

    const additionalServices: WorkflowsPluginStartAdditionalServices = {
      storage: new Storage(localStorage),
    };

    return { ...coreStart, ...depsStart, ...additionalServices };
  }
}
