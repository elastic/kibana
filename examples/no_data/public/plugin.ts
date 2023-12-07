/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { NoDataExamplesPluginSetup, NoDataExamplesPluginStart } from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { NoDataExamplesPluginSetupDeps } from '.';

export class NoDataExamplesPlugin
  implements Plugin<NoDataExamplesPluginSetup, NoDataExamplesPluginStart>
{
  public setup(core: CoreSetup, deps: NoDataExamplesPluginSetupDeps) {
    const { developerExamples, noDataPage } = deps;

    // Register an application into the side navigation menu
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, params, { noDataPage });
      },
    });

    // This section is only needed to get this example plugin to show up in our Developer Examples.
    developerExamples.register({
      appId: PLUGIN_ID,
      title: PLUGIN_NAME,
      description: `Demonstrates the stateful capabilities of integrated NoDataPage services`,
    });

    return {};
  }

  public start(_: CoreStart): NoDataExamplesPluginStart {
    return {};
  }

  public stop() {}
}
