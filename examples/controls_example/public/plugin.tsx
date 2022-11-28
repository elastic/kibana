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
import img from './control_group_image.png';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export interface ControlsExampleStartDeps {
  data: DataPublicPluginStart;
}

export class ControlsExamplePlugin
  implements Plugin<void, void, SetupDeps, ControlsExampleStartDeps>
{
  public setup(core: CoreSetup<ControlsExampleStartDeps>, { developerExamples }: SetupDeps) {
    core.application.register({
      id: 'controlsExamples',
      title: 'Controls examples',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const [, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(depsStart, params);
      },
    });

    developerExamples.register({
      appId: 'controlsExamples',
      title: 'Controls as a Building Block',
      description: `Showcases different ways to embed a control group into your app`,
      image: img,
    });
  }

  public start(core: CoreStart) {}

  public stop() {}
}
