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

import { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import { UrlForwardingSetup, UrlForwardingStart } from 'src/plugins/url_forwarding/public';
import {
  App,
  Plugin,
  CoreSetup,
  CoreStart,
  AppUpdater,
  ScopedHistory,
  AppMountParameters,
  DEFAULT_APP_CATEGORIES,
  PluginInitializerContext,
  SavedObjectsClientContract,
} from '../../../core/public';

import { createKbnUrlTracker } from './services/kibana_utils';
import { UsageCollectionSetup } from './services/usage_collection';
import { UiActionsSetup, UiActionsStart } from './services/ui_actions';
import { KibanaLegacySetup, KibanaLegacyStart } from './services/kibana_legacy';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from './services/home';
import { NavigationPublicPluginStart as NavigationStart } from './services/navigation';
import { DataPublicPluginSetup, DataPublicPluginStart, esFilters } from './services/data';
import { SharePluginSetup, SharePluginStart, UrlGeneratorContract } from './services/share';
import type { SavedObjectTaggingOssPluginStart } from './services/saved_objects_tagging_oss';
import {
  getSavedObjectFinder,
  SavedObjectLoader,
  SavedObjectsStart,
} from './services/saved_objects';
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddableSetup,
  EmbeddableStart,
  PANEL_NOTIFICATION_TRIGGER,
} from './services/embeddable';
import {
  ExitFullScreenButton as ExitFullScreenButtonUi,
  ExitFullScreenButtonProps,
} from './services/kibana_react';

import {
  ClonePanelAction,
  createDashboardContainerByValueRenderer,
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainerFactory,
  DashboardContainerFactoryDefinition,
  ExpandPanelAction,
  ReplacePanelAction,
  UnlinkFromLibraryAction,
  AddToLibraryAction,
  LibraryNotificationAction,
} from './application';
import {
  createDashboardUrlGenerator,
  DASHBOARD_APP_URL_GENERATOR,
  DashboardUrlGeneratorState,
} from './url_generator';
import { createSavedDashboardLoader } from './saved_dashboards';
import { DashboardConstants } from './dashboard_constants';
import { PlaceholderEmbeddableFactory } from './application/embeddable/placeholder';
import { UrlGeneratorState } from '../../share/public';
import { ExportCSVAction } from './application/actions/export_csv_action';
import { dashboardFeatureCatalog } from './dashboard_strings';
import { replaceUrlHashQuery } from '../../kibana_utils/public';

declare module '../../share/public' {
  export interface UrlGeneratorStateMapping {
    [DASHBOARD_APP_URL_GENERATOR]: UrlGeneratorState<DashboardUrlGeneratorState>;
  }
}

export type DashboardUrlGenerator = UrlGeneratorContract<typeof DASHBOARD_APP_URL_GENERATOR>;

export interface DashboardFeatureFlagConfig {
  allowByValueEmbeddables: boolean;
}

export interface DashboardSetupDependencies {
  data: DataPublicPluginSetup;
  embeddable: EmbeddableSetup;
  home?: HomePublicPluginSetup;
  kibanaLegacy: KibanaLegacySetup;
  urlForwarding: UrlForwardingSetup;
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface DashboardStartDependencies {
  data: DataPublicPluginStart;
  kibanaLegacy: KibanaLegacyStart;
  urlForwarding: UrlForwardingStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStartContract;
  navigation: NavigationStart;
  savedObjectsClient: SavedObjectsClientContract;
  share?: SharePluginStart;
  uiActions: UiActionsStart;
  savedObjects: SavedObjectsStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
}

export type DashboardSetup = void;

export interface DashboardStart {
  getSavedDashboardLoader: () => SavedObjectLoader;
  dashboardUrlGenerator?: DashboardUrlGenerator;
  dashboardFeatureFlagConfig: DashboardFeatureFlagConfig;
  DashboardContainerByValueRenderer: ReturnType<typeof createDashboardContainerByValueRenderer>;
}

export class DashboardPlugin
  implements
    Plugin<DashboardSetup, DashboardStart, DashboardSetupDependencies, DashboardStartDependencies> {
  constructor(private initializerContext: PluginInitializerContext) {}

  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;
  private currentHistory: ScopedHistory | undefined = undefined;
  private dashboardFeatureFlagConfig?: DashboardFeatureFlagConfig;

  private dashboardUrlGenerator?: DashboardUrlGenerator;

  public setup(
    core: CoreSetup<DashboardStartDependencies, DashboardStart>,
    {
      share,
      uiActions,
      embeddable,
      home,
      urlForwarding,
      data,
      usageCollection,
    }: DashboardSetupDependencies
  ): DashboardSetup {
    this.dashboardFeatureFlagConfig = this.initializerContext.config.get<DashboardFeatureFlagConfig>();
    const startServices = core.getStartServices();

    if (share) {
      this.dashboardUrlGenerator = share.urlGenerators.registerUrlGenerator(
        createDashboardUrlGenerator(async () => {
          const [coreStart, , selfStart] = await startServices;
          return {
            appBasePath: coreStart.application.getUrlForApp('dashboards'),
            useHashedUrl: coreStart.uiSettings.get('state:storeInSessionStorage'),
            savedDashboardLoader: selfStart.getSavedDashboardLoader(),
          };
        })
      );
    }

    const getStartServices = async () => {
      const [coreStart, deps] = await core.getStartServices();

      const useHideChrome = ({ toggleChrome } = { toggleChrome: true }) => {
        React.useEffect(() => {
          if (toggleChrome) {
            coreStart.chrome.setIsVisible(false);
          }

          return () => {
            if (toggleChrome) {
              coreStart.chrome.setIsVisible(true);
            }
          };
        }, [toggleChrome]);
      };

      const ExitFullScreenButton: React.FC<
        ExitFullScreenButtonProps & {
          toggleChrome: boolean;
        }
      > = ({ toggleChrome, ...props }) => {
        useHideChrome({ toggleChrome });
        return <ExitFullScreenButtonUi {...props} />;
      };
      return {
        SavedObjectFinder: getSavedObjectFinder(coreStart.savedObjects, coreStart.uiSettings),
        hideWriteControls: deps.kibanaLegacy.dashboardConfig.getHideWriteControls(),
        notifications: coreStart.notifications,
        application: coreStart.application,
        uiSettings: coreStart.uiSettings,
        overlays: coreStart.overlays,
        embeddable: deps.embeddable,
        uiActions: deps.uiActions,
        inspector: deps.inspector,
        http: coreStart.http,
        ExitFullScreenButton,
      };
    };

    if (share) {
      this.dashboardUrlGenerator = share.urlGenerators.registerUrlGenerator(
        createDashboardUrlGenerator(async () => {
          const [coreStart, , selfStart] = await core.getStartServices();
          return {
            appBasePath: coreStart.application.getUrlForApp('dashboards'),
            useHashedUrl: coreStart.uiSettings.get('state:storeInSessionStorage'),
            savedDashboardLoader: selfStart.getSavedDashboardLoader(),
          };
        })
      );
    }

    const {
      appMounted,
      appUnMounted,
      stop: stopUrlTracker,
      restorePreviousUrl,
    } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend('/app/dashboards'),
      defaultSubUrl: `#${DashboardConstants.LANDING_PAGE_PATH}`,
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
      getHistory: () => this.currentHistory!,
      onBeforeNavLinkSaved: (newNavLink: string) => {
        // Do not save SEARCH_SESSION_ID into nav link, because of possible edge cases
        // that could lead to session restoration failure.
        // see: https://github.com/elastic/kibana/issues/87149
        if (newNavLink.includes(DashboardConstants.SEARCH_SESSION_ID)) {
          newNavLink = replaceUrlHashQuery(newNavLink, (query) => {
            delete query[DashboardConstants.SEARCH_SESSION_ID];
            return query;
          });
        }

        return newNavLink;
      },
    });

    const dashboardContainerFactory = new DashboardContainerFactoryDefinition(getStartServices);
    embeddable.registerEmbeddableFactory(dashboardContainerFactory.type, dashboardContainerFactory);

    const placeholderFactory = new PlaceholderEmbeddableFactory();
    embeddable.registerEmbeddableFactory(placeholderFactory.type, placeholderFactory);

    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    const app: App = {
      id: DashboardConstants.DASHBOARDS_ID,
      title: 'Dashboard',
      order: 2500,
      euiIconType: 'logoKibana',
      defaultPath: `#${DashboardConstants.LANDING_PAGE_PATH}`,
      updater$: this.appStateUpdater,
      category: DEFAULT_APP_CATEGORIES.kibana,
      mount: async (params: AppMountParameters) => {
        this.currentHistory = params.history;
        params.element.classList.add('dshAppContainer');
        const { mountApp } = await import('./application/dashboard_router');
        appMounted();
        return mountApp({
          core,
          appUnMounted,
          usageCollection,
          onAppLeave: params.onAppLeave,
          initializerContext: this.initializerContext,
          restorePreviousUrl,
          element: params.element,
          scopedHistory: this.currentHistory!,
          setHeaderActionMenu: params.setHeaderActionMenu,
        });
      },
    };

    core.application.register(app);
    urlForwarding.forwardApp(
      DashboardConstants.DASHBOARDS_ID,
      DashboardConstants.DASHBOARDS_ID,
      (path) => {
        const [, tail] = /(\?.*)/.exec(path) || [];
        // carry over query if it exists
        return `#/list${tail || ''}`;
      }
    );
    urlForwarding.forwardApp(
      DashboardConstants.DASHBOARD_ID,
      DashboardConstants.DASHBOARDS_ID,
      (path) => {
        const [, id, tail] = /dashboard\/?(.*?)($|\?.*)/.exec(path) || [];
        if (!id && !tail) {
          // unrecognized sub url
          return '#/list';
        }
        if (!id && tail) {
          // unsaved dashboard, but probably state in URL
          return `#/create${tail || ''}`;
        }
        // persisted dashboard, probably with url state
        return `#/view/${id}${tail || ''}`;
      }
    );

    if (home) {
      home.featureCatalogue.register({
        id: DashboardConstants.DASHBOARD_ID,
        title: dashboardFeatureCatalog.getTitle(),
        subtitle: dashboardFeatureCatalog.getSubtitle(),
        description: dashboardFeatureCatalog.getDescription(),
        icon: 'dashboardApp',
        path: `/app/dashboards#${DashboardConstants.LANDING_PAGE_PATH}`,
        showOnHomePage: false,
        category: FeatureCatalogueCategory.DATA,
        solutionId: 'kibana',
        order: 100,
      });
    }
  }

  public start(core: CoreStart, plugins: DashboardStartDependencies): DashboardStart {
    const { notifications } = core;
    const { uiActions, data, share } = plugins;

    const SavedObjectFinder = getSavedObjectFinder(core.savedObjects, core.uiSettings);

    const expandPanelAction = new ExpandPanelAction();
    uiActions.registerAction(expandPanelAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, expandPanelAction.id);

    const changeViewAction = new ReplacePanelAction(
      core,
      SavedObjectFinder,
      notifications,
      plugins.embeddable.getEmbeddableFactories
    );
    uiActions.registerAction(changeViewAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, changeViewAction.id);

    const clonePanelAction = new ClonePanelAction(core);
    uiActions.registerAction(clonePanelAction);
    uiActions.attachAction(CONTEXT_MENU_TRIGGER, clonePanelAction.id);

    if (share) {
      const ExportCSVPlugin = new ExportCSVAction({ core, data });
      uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, ExportCSVPlugin);
    }

    if (this.dashboardFeatureFlagConfig?.allowByValueEmbeddables) {
      const addToLibraryAction = new AddToLibraryAction({ toasts: notifications.toasts });
      uiActions.registerAction(addToLibraryAction);
      uiActions.attachAction(CONTEXT_MENU_TRIGGER, addToLibraryAction.id);

      const unlinkFromLibraryAction = new UnlinkFromLibraryAction({ toasts: notifications.toasts });
      uiActions.registerAction(unlinkFromLibraryAction);
      uiActions.attachAction(CONTEXT_MENU_TRIGGER, unlinkFromLibraryAction.id);

      const libraryNotificationAction = new LibraryNotificationAction(unlinkFromLibraryAction);
      uiActions.registerAction(libraryNotificationAction);
      uiActions.attachAction(PANEL_NOTIFICATION_TRIGGER, libraryNotificationAction.id);
    }

    const savedDashboardLoader = createSavedDashboardLoader({
      savedObjectsClient: core.savedObjects.client,
      savedObjects: plugins.savedObjects,
      embeddableStart: plugins.embeddable,
    });
    const dashboardContainerFactory = plugins.embeddable.getEmbeddableFactory(
      DASHBOARD_CONTAINER_TYPE
    )! as DashboardContainerFactory;

    return {
      getSavedDashboardLoader: () => savedDashboardLoader,
      dashboardUrlGenerator: this.dashboardUrlGenerator,
      dashboardFeatureFlagConfig: this.dashboardFeatureFlagConfig!,
      DashboardContainerByValueRenderer: createDashboardContainerByValueRenderer({
        factory: dashboardContainerFactory,
      }),
    };
  }

  public stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
