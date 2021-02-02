/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart } from '../../../src/core/public';
import { UiActionsSetup, UiActionsStart } from '../../../src/plugins/ui_actions/public';
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
    Plugin<void, void, UiActionExamplesSetupDependencies, UiActionExamplesStartDependencies> {
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
