/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { createHelloWorldAction } from './hello_world_action';
import { helloWorldTrigger } from './hello_world_trigger';

export interface UiActionExamplesSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface UiActionExamplesStartDependencies {
  uiActions: UiActionsStart;
}

export class UiActionExamplesPlugin
  implements
    Plugin<void, void, UiActionExamplesSetupDependencies, UiActionExamplesStartDependencies>
{
  public setup(
    core: CoreSetup<UiActionExamplesStartDependencies>,
    { uiActions }: UiActionExamplesSetupDependencies
  ) {
    uiActions.registerTrigger(helloWorldTrigger);

    const helloWorldAction = createHelloWorldAction(async () => ({
      openModal: (await core.getStartServices())[0].overlays.openModal,
    }));

    uiActions.registerAction(helloWorldAction);
    uiActions.addTriggerAction(helloWorldTrigger.id, helloWorldAction);
  }

  public start(core: CoreStart, plugins: UiActionExamplesStartDependencies) {}

  public stop() {}
}
