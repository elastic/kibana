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

/* eslint-disable max-classes-per-file */

import * as React from 'react';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { SharePluginSetup } from 'src/plugins/share/public';
import { UiActionsSetup, UiActionsStart } from '../../../plugins/ui_actions/public';
import { CONTEXT_MENU_TRIGGER, IEmbeddableSetup, IEmbeddableStart } from './embeddable_plugin';
import { ExpandPanelAction, ReplacePanelAction } from '.';
import { DashboardContainerFactory } from './embeddable/dashboard_container_factory';
import { Start as InspectorStartContract } from '../../../plugins/inspector/public';
import { getSavedObjectFinder } from '../../../plugins/saved_objects/public';
import {
  ExitFullScreenButton as ExitFullScreenButtonUi,
  ExitFullScreenButtonProps,
} from '../../../plugins/kibana_react/public';
import { ExpandPanelActionContext, ACTION_EXPAND_PANEL } from './actions/expand_panel_action';
import { ReplacePanelActionContext, ACTION_REPLACE_PANEL } from './actions/replace_panel_action';
import {
  DashboardAppLinkGeneratorState,
  DASHBOARD_APP_URL_GENERATOR,
  createDirectAccessDashboardLinkGenerator,
} from './url_generator';

declare module '../../share/public' {
  export interface UrlGeneratorStateMapping {
    [DASHBOARD_APP_URL_GENERATOR]: DashboardAppLinkGeneratorState;
  }
}

interface SetupDependencies {
  embeddable: IEmbeddableSetup;
  uiActions: UiActionsSetup;
  share?: SharePluginSetup;
}

interface StartDependencies {
  embeddable: IEmbeddableStart;
  inspector: InspectorStartContract;
  uiActions: UiActionsStart;
}

export type Setup = void;
export type Start = void;

declare module '../../../plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_EXPAND_PANEL]: ExpandPanelActionContext;
    [ACTION_REPLACE_PANEL]: ReplacePanelActionContext;
  }
}

export class DashboardEmbeddableContainerPublicPlugin
  implements Plugin<Setup, Start, SetupDependencies, StartDependencies> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { share, uiActions }: SetupDependencies): Setup {
    const expandPanelAction = new ExpandPanelAction();
    uiActions.registerAction(expandPanelAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, expandPanelAction);
    const startServices = core.getStartServices();

    if (share) {
      share.urlGenerators.registerUrlGenerator(
        createDirectAccessDashboardLinkGenerator(async () => ({
          appBasePath: (await startServices)[0].application.getUrlForApp('dashboard'),
          useHashedUrl: (await startServices)[0].uiSettings.get('state:storeInSessionStorage'),
        }))
      );
    }
  }

  public start(core: CoreStart, plugins: StartDependencies): Start {
    const { application, notifications, overlays } = core;
    const { embeddable, inspector, uiActions } = plugins;

    const SavedObjectFinder = getSavedObjectFinder(core.savedObjects, core.uiSettings);

    const useHideChrome = () => {
      React.useEffect(() => {
        core.chrome.setIsVisible(false);
        return () => core.chrome.setIsVisible(true);
      }, []);
    };

    const ExitFullScreenButton: React.FC<ExitFullScreenButtonProps> = props => {
      useHideChrome();
      return <ExitFullScreenButtonUi {...props} />;
    };

    const changeViewAction = new ReplacePanelAction(
      core,
      SavedObjectFinder,
      notifications,
      plugins.embeddable.getEmbeddableFactories
    );
    uiActions.registerAction(changeViewAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, changeViewAction);

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
  }

  public stop() {}
}
