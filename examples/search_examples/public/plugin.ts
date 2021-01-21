/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  AppNavLinkStatus,
} from '../../../src/core/public';
import {
  SearchExamplesPluginSetup,
  SearchExamplesPluginStart,
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_NAME } from '../common';

export class SearchExamplesPlugin
  implements
    Plugin<
      SearchExamplesPluginSetup,
      SearchExamplesPluginStart,
      AppPluginSetupDependencies,
      AppPluginStartDependencies
    > {
  public setup(
    core: CoreSetup<AppPluginStartDependencies>,
    { developerExamples }: AppPluginSetupDependencies
  ): SearchExamplesPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'searchExamples',
      title: PLUGIN_NAME,
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart, params);
      },
    });

    developerExamples.register({
      appId: 'searchExamples',
      title: 'Search Examples',
      description: `Search Examples`,
    });

    return {};
  }

  public start(core: CoreStart): SearchExamplesPluginStart {
    return {};
  }

  public stop() {}
}
