/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/common';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { EmbeddableSetup, PANEL_HOVER_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { PLUGIN_ID } from './constants';
import img from './control_group_image.png';
import { EditControlAction } from './react_controls/actions/edit_control_action';
import { registerControlFactory } from './react_controls/control_factory_registry';
import { RANGE_SLIDER_CONTROL_TYPE } from './react_controls/data_controls/range_slider/types';
import { SEARCH_CONTROL_TYPE } from './react_controls/data_controls/search_control/types';
import { TIMESLIDER_CONTROL_TYPE } from './react_controls/timeslider_control/types';

interface SetupDeps {
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
    { developerExamples, embeddable }: SetupDeps
  ) {
    embeddable.registerReactEmbeddableFactory(CONTROL_GROUP_TYPE, async () => {
      const [{ getControlGroupEmbeddableFactory }, [coreStart, depsStart]] = await Promise.all([
        import('./react_controls/control_group/get_control_group_factory'),
        core.getStartServices(),
      ]);
      return getControlGroupEmbeddableFactory({
        core: coreStart,
        dataViews: depsStart.data.dataViews,
      });
    });

    registerControlFactory(RANGE_SLIDER_CONTROL_TYPE, async () => {
      const [{ getRangesliderControlFactory }, [coreStart, depsStart]] = await Promise.all([
        import('./react_controls/data_controls/range_slider/get_range_slider_control_factory'),
        core.getStartServices(),
      ]);

      return getRangesliderControlFactory({
        core: coreStart,
        data: depsStart.data,
        dataViews: depsStart.data.dataViews,
      });
    });

    registerControlFactory(SEARCH_CONTROL_TYPE, async () => {
      const [{ getSearchControlFactory: getSearchEmbeddableFactory }, [coreStart, depsStart]] =
        await Promise.all([
          import('./react_controls/data_controls/search_control/get_search_control_factory'),
          core.getStartServices(),
        ]);

      return getSearchEmbeddableFactory({
        core: coreStart,
        dataViewsService: depsStart.data.dataViews,
      });
    });

    registerControlFactory(TIMESLIDER_CONTROL_TYPE, async () => {
      const [{ getTimesliderControlFactory }, [coreStart, depsStart]] = await Promise.all([
        import('./react_controls/timeslider_control/get_timeslider_control_factory'),
        core.getStartServices(),
      ]);
      return getTimesliderControlFactory({
        core: coreStart,
        data: depsStart.data,
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

  public start(core: CoreStart, deps: ControlsExampleStartDeps) {
    const editControlAction = new EditControlAction();
    deps.uiActions.registerAction(editControlAction);
    deps.uiActions.attachAction(PANEL_HOVER_TRIGGER, editControlAction.id);
  }

  public stop() {}
}
