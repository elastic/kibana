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
  WorkflowsPluginStartDependencies,
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
  private readonly storage = new Storage(localStorage);

  public setup(core: CoreSetup, plugins: WorkflowsPluginSetupDependencies): WorkflowsPluginSetup {
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
      const storage = this.storage;
      // Register an application into the side navigation menu
      // TODO: add icon
      core.application.register({
        id: PLUGIN_ID,
        title: PLUGIN_NAME,
        appRoute: '/app/workflows',
        visibleIn: ['globalSearch', 'home', 'kibanaOverview', 'sideNav'],
        category: DEFAULT_APP_CATEGORIES.management,
        order: 9015,
        async mount(params: AppMountParameters) {
          // Load application bundle
          const { renderApp } = await import('./application');
          // Get start services as specified in kibana.json
          const [coreStart, depsStart] = await core.getStartServices();

          // Set badge for classic navbar
          coreStart.chrome.setBadge({
            text: 'Technical preview',
            tooltip:
              'This functionality is in technical preview. It may change or be removed in a future release.',
            iconType: 'beaker',
          });

          // Render the application
          return renderApp(
            coreStart,
            depsStart as WorkflowsPluginStartDependencies,
            {
              storage,
            },
            params
          );
        },
      });
    }

    // Return methods that should be available to other plugins
    return {
      // TODO: add methods here
    };
  }

  public start(core: CoreStart): WorkflowsPluginStart {
    return {};
  }

  public stop() {}
}
