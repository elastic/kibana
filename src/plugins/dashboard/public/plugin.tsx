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
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddableSetup,
  EmbeddableStart,
} from '../../../plugins/embeddable/public';
import { DataPublicPluginStart } from '../../../plugins/data/public';
import { SharePluginSetup } from '../../../plugins/share/public';
import { UiActionsSetup, UiActionsStart } from '../../../plugins/ui_actions/public';
import { ExpandPanelAction, ReplacePanelAction } from './actions';
import { DashboardContainerFactory } from './embeddable/dashboard_container_factory';
import { Start as InspectorStartContract } from '../../../plugins/inspector/public';
import { getSavedObjectFinder, SavedObjectLoader } from '../../../plugins/saved_objects/public';
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
import { createSavedDashboardLoader } from './saved_dashboards';

declare module '../../share/public' {
  export interface UrlGeneratorStateMapping {
    [DASHBOARD_APP_URL_GENERATOR]: DashboardAppLinkGeneratorState;
  }
}

interface SetupDependencies {
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
  share?: SharePluginSetup;
}

interface StartDependencies {
  embeddable: EmbeddableStart;
  inspector: InspectorStartContract;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
}

export type Setup = void;
export interface DashboardStart {
  getSavedDashboardLoader: () => SavedObjectLoader;
}

declare module '../../../plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_EXPAND_PANEL]: ExpandPanelActionContext;
    [ACTION_REPLACE_PANEL]: ReplacePanelActionContext;
  }
}

export class DashboardEmbeddableContainerPublicPlugin
  implements Plugin<Setup, DashboardStart, SetupDependencies, StartDependencies> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<StartDependencies>,
    { share, uiActions, embeddable }: SetupDependencies
  ): Setup {
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

    const getStartServices = async () => {
      const [coreStart, deps] = await core.getStartServices();

      const useHideChrome = () => {
        React.useEffect(() => {
          coreStart.chrome.setIsVisible(false);
          return () => coreStart.chrome.setIsVisible(true);
        }, []);
      };

      const ExitFullScreenButton: React.FC<ExitFullScreenButtonProps> = props => {
        useHideChrome();
        return <ExitFullScreenButtonUi {...props} />;
      };
      return {
        capabilities: coreStart.application.capabilities,
        application: coreStart.application,
        notifications: coreStart.notifications,
        overlays: coreStart.overlays,
        embeddable: deps.embeddable,
        inspector: deps.inspector,
        SavedObjectFinder: getSavedObjectFinder(coreStart.savedObjects, coreStart.uiSettings),
        ExitFullScreenButton,
        uiActions: deps.uiActions,
      };
    };

    const factory = new DashboardContainerFactory(getStartServices);
    embeddable.registerEmbeddableFactory(factory.type, factory);
  }

  public start(core: CoreStart, plugins: StartDependencies): DashboardStart {
    const { notifications } = core;
    const {
      uiActions,
      data: { indexPatterns },
    } = plugins;

    const SavedObjectFinder = getSavedObjectFinder(core.savedObjects, core.uiSettings);

    const changeViewAction = new ReplacePanelAction(
      core,
      SavedObjectFinder,
      notifications,
      plugins.embeddable.getEmbeddableFactories
    );
    uiActions.registerAction(changeViewAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, changeViewAction);
    const savedDashboardLoader = createSavedDashboardLoader({
      savedObjectsClient: core.savedObjects.client,
      indexPatterns,
      chrome: core.chrome,
      overlays: core.overlays,
      embeddable: plugins.embeddable,
    });
    return {
      getSavedDashboardLoader: () => savedDashboardLoader,
    };
  }

  public stop() {}
}
