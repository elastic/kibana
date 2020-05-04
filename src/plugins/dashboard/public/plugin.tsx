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

import * as React from 'react';
import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';

import {
  App,
  AppMountParameters,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Plugin,
  SavedObjectsClientContract,
} from 'src/core/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddableSetup,
  EmbeddableStart,
} from '../../../plugins/embeddable/public';
import {
  DataPublicPluginStart,
  DataPublicPluginSetup,
  esFilters,
} from '../../../plugins/data/public';
import { SharePluginSetup, SharePluginStart } from '../../../plugins/share/public';
import { UiActionsSetup, UiActionsStart } from '../../../plugins/ui_actions/public';

import { Start as InspectorStartContract } from '../../../plugins/inspector/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../plugins/navigation/public';
import { getSavedObjectFinder, SavedObjectLoader } from '../../../plugins/saved_objects/public';
import {
  ExitFullScreenButton as ExitFullScreenButtonUi,
  ExitFullScreenButtonProps,
} from '../../../plugins/kibana_react/public';
import { createKbnUrlTracker, Storage } from '../../../plugins/kibana_utils/public';
import {
  AngularRenderedAppUpdater,
  KibanaLegacySetup,
  KibanaLegacyStart,
  initAngularBootstrap,
} from '../../../plugins/kibana_legacy/public';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '../../../plugins/home/public';

import {
  DashboardContainerFactory,
  ExpandPanelAction,
  ExpandPanelActionContext,
  ReplacePanelAction,
  ReplacePanelActionContext,
  ClonePanelAction,
  ClonePanelActionContext,
  ACTION_EXPAND_PANEL,
  ACTION_REPLACE_PANEL,
  RenderDeps,
  ACTION_CLONE_PANEL,
} from './application';
import {
  DashboardAppLinkGeneratorState,
  DASHBOARD_APP_URL_GENERATOR,
  createDirectAccessDashboardLinkGenerator,
} from './url_generator';
import { createSavedDashboardLoader } from './saved_dashboards';
import { DashboardConstants } from './dashboard_constants';
import { PlaceholderEmbeddableFactory } from './application/embeddable/placeholder';

declare module '../../share/public' {
  export interface UrlGeneratorStateMapping {
    [DASHBOARD_APP_URL_GENERATOR]: DashboardAppLinkGeneratorState;
  }
}

interface SetupDependencies {
  data: DataPublicPluginSetup;
  embeddable: EmbeddableSetup;
  home?: HomePublicPluginSetup;
  kibanaLegacy: KibanaLegacySetup;
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
  usageCollection?: UsageCollectionSetup;
}

interface StartDependencies {
  data: DataPublicPluginStart;
  kibanaLegacy: KibanaLegacyStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStartContract;
  navigation: NavigationStart;
  savedObjectsClient: SavedObjectsClientContract;
  share?: SharePluginStart;
  uiActions: UiActionsStart;
}

export type Setup = void;
export interface DashboardStart {
  getSavedDashboardLoader: () => SavedObjectLoader;
}

declare module '../../../plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_EXPAND_PANEL]: ExpandPanelActionContext;
    [ACTION_REPLACE_PANEL]: ReplacePanelActionContext;
    [ACTION_CLONE_PANEL]: ClonePanelActionContext;
  }
}

export class DashboardPlugin
  implements Plugin<Setup, DashboardStart, SetupDependencies, StartDependencies> {
  constructor(private initializerContext: PluginInitializerContext) {}

  private appStateUpdater = new BehaviorSubject<AngularRenderedAppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;

  public setup(
    core: CoreSetup<StartDependencies, DashboardStart>,
    { share, uiActions, embeddable, home, kibanaLegacy, data, usageCollection }: SetupDependencies
  ): Setup {
    const expandPanelAction = new ExpandPanelAction();
    uiActions.registerAction(expandPanelAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, expandPanelAction);
    const startServices = core.getStartServices();

    if (share) {
      share.urlGenerators.registerUrlGenerator(
        createDirectAccessDashboardLinkGenerator(async () => {
          const [coreStart, , selfStart] = await startServices;
          return {
            appBasePath: coreStart.application.getUrlForApp('dashboard'),
            useHashedUrl: coreStart.uiSettings.get('state:storeInSessionStorage'),
            savedDashboardLoader: selfStart.getSavedDashboardLoader(),
          };
        })
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

    const placeholderFactory = new PlaceholderEmbeddableFactory();
    embeddable.registerEmbeddableFactory(placeholderFactory.type, placeholderFactory);

    const { appMounted, appUnMounted, stop: stopUrlTracker } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend('/app/kibana'),
      defaultSubUrl: `#${DashboardConstants.LANDING_PAGE_PATH}`,
      shouldTrackUrlUpdate: pathname => {
        const targetAppName = pathname.split('/')[1];
        return (
          targetAppName === DashboardConstants.DASHBOARDS_ID ||
          targetAppName === DashboardConstants.DASHBOARD_ID
        );
      },
      storageKey: `lastUrl:${core.http.basePath.get()}:dashboard`,
      navLinkUpdater$: this.appStateUpdater,
      toastNotifications: core.notifications.toasts,
      stateParams: [
        {
          kbnUrlKey: '_g',
          stateUpdate$: data.query.state$.pipe(
            filter(
              ({ changes }) => !!(changes.globalFilters || changes.time || changes.refreshInterval)
            ),
            map(({ state }) => ({
              ...state,
              filters: state.filters?.filter(esFilters.isFilterPinned),
            }))
          ),
        },
      ],
    });

    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    const app: App = {
      id: '',
      title: 'Dashboards',
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart, dashboardStart] = await core.getStartServices();
        appMounted();
        const {
          embeddable: embeddableStart,
          navigation,
          share: shareStart,
          data: dataStart,
          kibanaLegacy: { dashboardConfig },
        } = pluginsStart;

        const deps: RenderDeps = {
          pluginInitializerContext: this.initializerContext,
          core: coreStart,
          dashboardConfig,
          navigation,
          share: shareStart,
          data: dataStart,
          savedObjectsClient: coreStart.savedObjects.client,
          savedDashboards: dashboardStart.getSavedDashboardLoader(),
          chrome: coreStart.chrome,
          addBasePath: coreStart.http.basePath.prepend,
          uiSettings: coreStart.uiSettings,
          config: kibanaLegacy.config,
          savedQueryService: dataStart.query.savedQueries,
          embeddable: embeddableStart,
          dashboardCapabilities: coreStart.application.capabilities.dashboard,
          embeddableCapabilities: {
            visualizeCapabilities: coreStart.application.capabilities.visualize,
            mapsCapabilities: coreStart.application.capabilities.maps,
          },
          localStorage: new Storage(localStorage),
          usageCollection,
        };
        // make sure the index pattern list is up to date
        await dataStart.indexPatterns.clearCache();
        const { renderApp } = await import('./application/application');
        const unmount = renderApp(params.element, params.appBasePath, deps);
        return () => {
          unmount();
          appUnMounted();
        };
      },
    };

    initAngularBootstrap();

    kibanaLegacy.registerLegacyApp({
      ...app,
      id: DashboardConstants.DASHBOARD_ID,
      // only register the updater in once app, otherwise all updates would happen twice
      updater$: this.appStateUpdater.asObservable(),
      navLinkId: 'kibana:dashboard',
    });
    kibanaLegacy.registerLegacyApp({ ...app, id: DashboardConstants.DASHBOARDS_ID });

    if (home) {
      home.featureCatalogue.register({
        id: DashboardConstants.DASHBOARD_ID,
        title: i18n.translate('dashboard.featureCatalogue.dashboardTitle', {
          defaultMessage: 'Dashboard',
        }),
        description: i18n.translate('dashboard.featureCatalogue.dashboardDescription', {
          defaultMessage: 'Display and share a collection of visualizations and saved searches.',
        }),
        icon: 'dashboardApp',
        path: `/app/kibana#${DashboardConstants.LANDING_PAGE_PATH}`,
        showOnHomePage: true,
        category: FeatureCatalogueCategory.DATA,
      });
    }
  }

  public start(core: CoreStart, plugins: StartDependencies): DashboardStart {
    const { notifications } = core;
    const {
      uiActions,
      data: { indexPatterns, search },
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

    const clonePanelAction = new ClonePanelAction(core);
    uiActions.registerAction(clonePanelAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, clonePanelAction);

    const savedDashboardLoader = createSavedDashboardLoader({
      savedObjectsClient: core.savedObjects.client,
      indexPatterns,
      search,
      chrome: core.chrome,
      overlays: core.overlays,
    });
    return {
      getSavedDashboardLoader: () => savedDashboardLoader,
    };
  }

  public stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
