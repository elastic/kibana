/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  UnifiedFieldListExamplesPluginSetup,
  UnifiedFieldListExamplesPluginStart,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import image from './unified_field_list.png';

export class UnifiedFieldListExamplesPlugin
  implements
    Plugin<
      UnifiedFieldListExamplesPluginSetup,
      UnifiedFieldListExamplesPluginStart,
      AppPluginSetupDependencies,
      AppPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<AppPluginStartDependencies>,
    { developerExamples }: AppPluginSetupDependencies
  ): UnifiedFieldListExamplesPluginSetup {
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
      description: `Examples of unified field list functionality.`,
      image,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/packages/kbn-unified-field-list/README.md',
          iconType: 'logoGithub',
          target: '_blank',
          size: 's',
        },
      ],
    });

    return {};
  }

  public start(core: CoreStart): UnifiedFieldListExamplesPluginStart {
    return {};
  }

  public stop() {}
}
