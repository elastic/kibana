/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  UnifiedTabsExamplesPluginSetup,
  UnifiedTabsExamplesPluginStart,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import image from './unified_tabs.png';

export class UnifiedTabsExamplesPlugin
  implements
    Plugin<
      UnifiedTabsExamplesPluginSetup,
      UnifiedTabsExamplesPluginStart,
      AppPluginSetupDependencies,
      AppPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<AppPluginStartDependencies>,
    { developerExamples }: AppPluginSetupDependencies
  ): UnifiedTabsExamplesPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: [],
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
      appId: PLUGIN_ID,
      title: PLUGIN_NAME,
      description: `Examples of unified tabs functionality.`,
      image,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-unified-tabs/README.md',
          iconType: 'logoGithub',
          target: '_blank',
          size: 's',
        },
      ],
    });

    return {};
  }

  public start(core: CoreStart): UnifiedTabsExamplesPluginStart {
    return {};
  }

  public stop() {}
}
