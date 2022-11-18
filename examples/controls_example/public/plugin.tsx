/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AppMountParameters,
  AppNavLinkStatus,
  CoreSetup,
  CoreStart,
  Plugin,
} from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import img from './pikachu.jpeg';

// import { ControlsPluginStart } from '@kbn/controls-plugin/public';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export interface ControlsExampleStartDeps {
  data: DataPublicPluginStart;
}

// interface StartDeps {
//   controls: ControlsPluginStart;
// }

export class ControlsExamplePlugin
  implements Plugin<void, void, SetupDeps, ControlsExampleStartDeps>
{
  public setup(core: CoreSetup<ControlsExampleStartDeps>, { developerExamples }: SetupDeps) {
    core.application.register({
      id: 'controlsExamples',
      title: 'Controls examples',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(depsStart, params);
      },
    });

    developerExamples.register({
      appId: 'controlsExamples',
      title: 'Controls Building Block',
      description: `Showcase different ways how to embed dashboard container into your app`,
      image: img,
    });
  }

  public start(core: CoreStart) {}

  public stop() {}
}
