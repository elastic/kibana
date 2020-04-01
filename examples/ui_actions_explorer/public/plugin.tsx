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
  makePhoneCallAction,
  showcasePluggability,
  UserContext,
  CountryContext,
  PhoneContext,
  ACTION_EDIT_USER,
  ACTION_SHOWCASE_PLUGGABILITY,
  ACTION_CALL_PHONE_NUMBER,
  ACTION_TRAVEL_GUIDE,
  ACTION_VIEW_IN_MAPS,
  ACTION_PHONE_USER,
} from './actions/actions';

interface StartDeps {
  uiActions: UiActionsStart;
}

interface SetupDeps {
  uiActions: UiActionsSetup;
}

declare module '../../../src/plugins/ui_actions/public' {
  export interface TriggerContextMapping {
    [USER_TRIGGER]: UserContext;
    [COUNTRY_TRIGGER]: CountryContext;
    [PHONE_TRIGGER]: PhoneContext;
  }

  export interface ActionContextMapping {
    [ACTION_EDIT_USER]: UserContext;
    [ACTION_SHOWCASE_PLUGGABILITY]: {};
    [ACTION_CALL_PHONE_NUMBER]: PhoneContext;
    [ACTION_TRAVEL_GUIDE]: CountryContext;
    [ACTION_VIEW_IN_MAPS]: CountryContext;
    [ACTION_PHONE_USER]: UserContext;
  }
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

    const startServices = core.getStartServices();

    deps.uiActions.attachAction(
      USER_TRIGGER,
      createPhoneUserAction(async () => (await startServices)[1].uiActions)
    );
    deps.uiActions.attachAction(
      USER_TRIGGER,
      createEditUserAction(async () => (await startServices)[0].overlays.openModal)
    );

    deps.uiActions.attachAction(COUNTRY_TRIGGER, viewInMapsAction);
    deps.uiActions.attachAction(COUNTRY_TRIGGER, lookUpWeatherAction);
    deps.uiActions.attachAction(COUNTRY_TRIGGER, showcasePluggability);
    deps.uiActions.attachAction(PHONE_TRIGGER, makePhoneCallAction);
    deps.uiActions.attachAction(PHONE_TRIGGER, showcasePluggability);
    deps.uiActions.attachAction(USER_TRIGGER, showcasePluggability);

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
