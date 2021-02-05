/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  AppNavLinkStatus,
  PluginInitializerContext,
} from '../../../src/core/public';
import {
  SearchExamplesPluginSetup,
  SearchExamplesPluginStart,
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_NAME } from '../common';
import type { ConfigSchema } from '../../../src/plugins/data/config';

export class SearchExamplesPlugin
  implements
    Plugin<
      SearchExamplesPluginSetup,
      SearchExamplesPluginStart,
      AppPluginSetupDependencies,
      AppPluginStartDependencies
    > {
  private readonly shardDelayEnabled: boolean = false;
  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.shardDelayEnabled = initializerContext.config.get().search.aggs.shardDelay.enabled;
  }

  public setup(
    core: CoreSetup<AppPluginStartDependencies>,
    { developerExamples }: AppPluginSetupDependencies
  ): SearchExamplesPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'searchExamples',
      title: PLUGIN_NAME,
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: async (params: AppMountParameters) => {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart, params, {
          shardDelayEnabled: this.shardDelayEnabled,
        });
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
