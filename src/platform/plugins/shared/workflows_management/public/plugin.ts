/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type {
  WorkflowsPluginSetup,
  WorkflowsPluginStart,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

export class WorkflowsPlugin implements Plugin<WorkflowsPluginSetup, WorkflowsPluginStart> {
  public setup(core: CoreSetup): WorkflowsPluginSetup {
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
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

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
