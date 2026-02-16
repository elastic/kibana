/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import type { MiniAppsPluginSetup, MiniAppsPluginStart, SetupDeps, StartDeps } from './types';

export class MiniAppsPlugin
  implements Plugin<MiniAppsPluginSetup, MiniAppsPluginStart, SetupDeps, StartDeps>
{
  public setup(core: CoreSetup<StartDeps, MiniAppsPluginStart>): MiniAppsPluginSetup {
    // Register the application
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      appRoute: '/app/mini_apps',
      euiIconType: 'apps',
      mount: async (params: AppMountParameters) => {
        // Load application bundle
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp(coreStart, depsStart, params);
      },
    });

    return {};
  }

  public start(core: CoreStart, deps: StartDeps): MiniAppsPluginStart {
    return {};
  }

  public stop() {}
}
