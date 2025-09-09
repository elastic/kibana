/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows/common/constants';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { getWorkflowsConnectorType } from './connectors/workflows';
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
    // Register workflows connector UI component
    plugins.triggersActionsUi.actionTypeRegistry.register(getWorkflowsConnectorType());

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
        async mount(params: AppMountParameters) {
          // Load application bundle
          const { renderApp } = await import('./application');
          // Get start services as specified in kibana.json
          const [coreStart, depsStart] = await core.getStartServices();
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
