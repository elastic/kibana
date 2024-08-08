/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ControlsPluginSetup } from '@kbn/controls-plugin/public/types';
import { PLUGIN_ID } from './constants';
import img from './control_group_image.png';
import { SEARCH_CONTROL_TYPE } from './search_control/types';

interface SetupDeps {
  controls: ControlsPluginSetup;
  developerExamples: DeveloperExamplesSetup;
  embeddable: EmbeddableSetup;
}

export interface ControlsExampleStartDeps {
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  uiActions: UiActionsStart;
}

export class ControlsExamplePlugin
  implements Plugin<void, void, SetupDeps, ControlsExampleStartDeps>
{
  public setup(
    core: CoreSetup<ControlsExampleStartDeps>,
    { controls, developerExamples, embeddable }: SetupDeps
  ) {
    controls.registerControlFactory(SEARCH_CONTROL_TYPE, async () => {
      const [{ getSearchControlFactory: getSearchEmbeddableFactory }, [coreStart, depsStart]] =
        await Promise.all([
          import('./search_control/get_search_control_factory'),
          core.getStartServices(),
        ]);

      return getSearchEmbeddableFactory({
        core: coreStart,
        data: depsStart.data,
        dataViews: depsStart.data.dataViews,
      });
    });

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
