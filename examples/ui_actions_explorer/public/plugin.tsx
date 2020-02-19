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

import { Plugin, CoreSetup, AppMountParameters } from 'kibana/public';
import { UiActionsStart, UiActionsSetup } from 'src/plugins/ui_actions/public';
import {
  PHONE_TRIGGER,
  USER_TRIGGER,
  COUNTRY_TRIGGER,
  createPhoneUserAction,
  lookUpWeatherAction,
  viewInMapsAction,
  createEditUserAction,
  CALL_PHONE_NUMBER_ACTION,
  VIEW_IN_MAPS_ACTION,
  TRAVEL_GUIDE_ACTION,
  PHONE_USER_ACTION,
  EDIT_USER_ACTION,
  makePhoneCallAction,
  showcasePluggability,
  SHOWCASE_PLUGGABILITY_ACTION,
} from './actions/actions';

interface StartDeps {
  uiActions: UiActionsStart;
}

interface SetupDeps {
  uiActions: UiActionsSetup;
}

export class UiActionsExplorerPlugin implements Plugin<void, void, {}, StartDeps> {
  public setup(core: CoreSetup<{ uiActions: UiActionsStart }>, deps: SetupDeps) {
    deps.uiActions.registerTrigger({
      id: COUNTRY_TRIGGER,
    });
    deps.uiActions.registerTrigger({
      id: PHONE_TRIGGER,
    });
    deps.uiActions.registerTrigger({
      id: USER_TRIGGER,
    });
    deps.uiActions.registerAction(lookUpWeatherAction);
    deps.uiActions.registerAction(viewInMapsAction);
    deps.uiActions.registerAction(makePhoneCallAction);
    deps.uiActions.registerAction(showcasePluggability);

    const startServices = core.getStartServices();
    deps.uiActions.registerAction(
      createPhoneUserAction(async () => (await startServices)[1].uiActions)
    );
    deps.uiActions.registerAction(
      createEditUserAction(async () => (await startServices)[0].overlays.openModal)
    );
    deps.uiActions.attachAction(USER_TRIGGER, PHONE_USER_ACTION);
    deps.uiActions.attachAction(USER_TRIGGER, EDIT_USER_ACTION);

    // What's missing here is type analysis to ensure the context emitted by the trigger
    // is the same context that the action requires.
    deps.uiActions.attachAction(COUNTRY_TRIGGER, VIEW_IN_MAPS_ACTION);
    deps.uiActions.attachAction(COUNTRY_TRIGGER, TRAVEL_GUIDE_ACTION);
    deps.uiActions.attachAction(COUNTRY_TRIGGER, SHOWCASE_PLUGGABILITY_ACTION);
    deps.uiActions.attachAction(PHONE_TRIGGER, CALL_PHONE_NUMBER_ACTION);
    deps.uiActions.attachAction(PHONE_TRIGGER, SHOWCASE_PLUGGABILITY_ACTION);
    deps.uiActions.attachAction(USER_TRIGGER, SHOWCASE_PLUGGABILITY_ACTION);

    core.application.register({
      id: 'uiActionsExplorer',
      title: 'Ui Actions Explorer',
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');
        return renderApp(
          { uiActionsApi: depsStart.uiActions, openModal: coreStart.overlays.openModal },
          params
        );
      },
    });
  }

  public start() {}

  public stop() {}
}
