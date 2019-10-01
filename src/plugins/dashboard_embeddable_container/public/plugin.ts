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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { IUiActionsSetup, IUiActionsStart } from '../../../plugins/ui_actions/public';
import { CONTEXT_MENU_TRIGGER, Plugin as EmbeddablePlugin } from './lib/embeddable_api';
import { ExpandPanelAction, DashboardContainerFactory } from './lib';
import {
  Setup as InspectorSetupContract,
  Start as InspectorStartContract,
} from '../../../plugins/inspector/public';
import { SavedObjectFinder } from '../../kibana_react/public';
import { ExitFullScreenButton } from '../../kibana_react/public';

interface SetupDependencies {
  embeddable: ReturnType<EmbeddablePlugin['setup']>;
  inspector: InspectorSetupContract;
  uiActions: IUiActionsSetup;
}

interface StartDependencies {
  embeddable: ReturnType<EmbeddablePlugin['start']>;
  inspector: InspectorStartContract;
  uiActions: IUiActionsStart;
}

export type Setup = void;
export type Start = void;

export class DashboardEmbeddableContainerPublicPlugin
  implements Plugin<Setup, Start, SetupDependencies, StartDependencies> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { embeddable, uiActions }: SetupDependencies): Setup {
    const expandPanelAction = new ExpandPanelAction();
    uiActions.registerAction(expandPanelAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, expandPanelAction.id);
  }

  public start(core: CoreStart, plugins: StartDependencies): Start {
    const { application, notifications, overlays } = core;
    const { embeddable, inspector, uiActions } = plugins;

    /*
    const factory = new DashboardContainerFactory({
      application,
      notifications,
      overlays,
      embeddable,
      inspector,
      SavedObjectFinder,
      ExitFullScreenButton,
      uiActions,
    });

    embeddable.registerEmbeddableFactory(factory.type, factory);
    */
  }

  public stop() {}
}
