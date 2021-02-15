/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart } from '../../../src/core/public';
import { UiActionsSetup, UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { createHelloWorldAction, ACTION_HELLO_WORLD } from './hello_world_action';
import { helloWorldTrigger, HELLO_WORLD_TRIGGER_ID } from './hello_world_trigger';

export interface UiActionExamplesSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface UiActionExamplesStartDependencies {
  uiActions: UiActionsStart;
}

declare module '../../../src/plugins/ui_actions/public' {
  export interface TriggerContextMapping {
    [HELLO_WORLD_TRIGGER_ID]: {};
  }

  export interface ActionContextMapping {
    [ACTION_HELLO_WORLD]: {};
  }
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
