/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Plugin, CoreSetup, CoreStart } from '../../../src/core/public';
import { UiActionsSetup, UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { createHelloWorldAction, HELLO_WORLD_ACTION_TYPE } from './hello_world_action';
import { helloWorldTrigger } from './hello_world_trigger';

interface UiActionExamplesSetupDependencies {
  uiActions: UiActionsSetup;
}

interface UiActionExamplesStartDependencies {
  uiActions: UiActionsStart;
}

export class UiActionExamplesPlugin
  implements
    Plugin<void, void, UiActionExamplesSetupDependencies, UiActionExamplesStartDependencies> {
  public setup(core: CoreSetup, { uiActions }: UiActionExamplesSetupDependencies) {
    uiActions.registerTrigger(helloWorldTrigger);
    uiActions.attachAction(helloWorldTrigger.id, HELLO_WORLD_ACTION_TYPE);
  }

  public start(coreStart: CoreStart, deps: UiActionExamplesStartDependencies) {
    deps.uiActions.registerAction(createHelloWorldAction(coreStart.overlays.openModal));
  }

  public stop() {}
}
