/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { PLUGIN_ID } from './constants';
import img from './control_group_image.png';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export interface ControlsExampleStartDeps {
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  uiActions: UiActionsStart;
}

export class ControlsExamplePlugin
  implements Plugin<void, void, SetupDeps, ControlsExampleStartDeps>
{
  public setup(core: CoreSetup<ControlsExampleStartDeps>, { developerExamples }: SetupDeps) {
    core.application.register({
      id: PLUGIN_ID,
      title: 'Controls examples',
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app/app');
        return renderApp(coreStart, depsStart, params);
      },
    });

    developerExamples.register({
      appId: 'controlsExamples',
      title: 'Controls',
      description: `Learn how to create new control types and use controls in your application`,
      image: img,
    });
  }

  public start(core: CoreStart, deps: ControlsExampleStartDeps) {}

  public stop() {}
}
