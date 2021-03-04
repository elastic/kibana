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
} from '../../../src/core/public';
import {
  SearchExamplesPluginSetup,
  SearchExamplesPluginStart,
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
} from './types';
import { createSearchSessionsExampleUrlGenerator } from './search_sessions/url_generator';
import { PLUGIN_NAME } from '../common';
import img from './search_examples.png';

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
    { developerExamples, share }: AppPluginSetupDependencies
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
        return renderApp(coreStart, depsStart, params);
      },
    });

    developerExamples.register({
      appId: 'searchExamples',
      title: 'Search Examples',
      description: `Examples on searching elasticsearch using data plugin: low-level search client (data.search.search), high-level search client (SearchSource), search sessions (data.search.sessions)`,
      image: img,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/master/src/plugins/data/README.mdx',
          iconType: 'logoGithub',
          target: '_blank',
          size: 's',
        },
      ],
    });

    // we need an URL generator for search session examples for restoring a search session
    share.urlGenerators.registerUrlGenerator(
      createSearchSessionsExampleUrlGenerator(() => {
        return core
          .getStartServices()
          .then(([coreStart]) => ({ appBasePath: coreStart.http.basePath.get() }));
      })
    );

    return {};
  }

  public start(core: CoreStart): SearchExamplesPluginStart {
    return {};
  }

  public stop() {}
}
