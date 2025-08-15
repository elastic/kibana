/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { helloWorldTrigger } from './hello_world_trigger';

export interface UiActionExamplesSetupDependencies {
  uiActions: UiActionsSetup;
}

export interface UiActionExamplesStartDependencies {
  uiActions: UiActionsStart;
}
export const HELLO_WORLD_ACTION = 'HELLO_WORLD_ACTION';
export class UiActionExamplesPlugin
  implements
    Plugin<void, void, UiActionExamplesSetupDependencies, UiActionExamplesStartDependencies>
{
  public setup(
    core: CoreSetup<UiActionExamplesStartDependencies>,
    { uiActions }: UiActionExamplesSetupDependencies
  ) {
    uiActions.registerTrigger(helloWorldTrigger);

    uiActions.addTriggerActionAsync(helloWorldTrigger.id, HELLO_WORLD_ACTION, async () => {
      const { createHelloWorldActionDefinition } = await import('./hello_world_action');
      return createHelloWorldActionDefinition(async () => (await core.getStartServices())[0]);
    });
  }

  public start(_core: CoreStart, _plugins: UiActionExamplesStartDependencies) {}

  public stop() {}
}
