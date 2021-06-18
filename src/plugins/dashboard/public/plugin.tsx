/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import { UrlForwardingSetup, UrlForwardingStart } from 'src/plugins/url_forwarding/public';
import { APP_WRAPPER_CLASS } from '../../../core/public';
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
import { VisualizationsStart } from '../../visualizations/public';

import { createKbnUrlTracker } from './services/kibana_utils';
import { UsageCollectionSetup } from './services/usage_collection';
import { UiActionsSetup, UiActionsStart } from './services/ui_actions';
import { PresentationUtilPluginStart } from './services/presentation_util';
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
  CopyToDashboardAction,
  DashboardCapabilities,
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
import { SpacesOssPluginStart } from './services/spaces';

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
  presentationUtil: PresentationUtilPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  spacesOss?: SpacesOssPluginStart;
  visualizations: VisualizationsStart;
}

export type DashboardSetup = void;

export interface DashboardStart {
  getSavedDashboardLoader: () => SavedObjectLoader;
  getDashboardContainerByValueRenderer: () => ReturnType<
    typeof createDashboardContainerByValueRenderer
  >;
  dashboardUrlGenerator?: DashboardUrlGenerator;
  dashboardFeatureFlagConfig: DashboardFeatureFlagConfig;
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
    { share, embeddable, home, urlForwarding, data, usageCollection }: DashboardSetupDependencies
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
        presentationUtil: deps.presentationUtil,
      };
    };

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

    getStartServices().then((coreStart) => {
      const dashboardContainerFactory = new DashboardContainerFactoryDefinition(
        getStartServices,
        coreStart.embeddable
      );
      embeddable.registerEmbeddableFactory(
        dashboardContainerFactory.type,
        dashboardContainerFactory
      );
    });

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
        params.element.classList.add(APP_WRAPPER_CLASS);
        const { mountApp } = await import('./application/dashboard_router');
        appMounted();
        return mountApp({
          core,
          appUnMounted,
          usageCollection,
          restorePreviousUrl,
          element: params.element,
          onAppLeave: params.onAppLeave,
          scopedHistory: this.currentHistory!,
          initializerContext: this.initializerContext,
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
    const { notifications, overlays, application } = core;
    const { uiActions, data, share, presentationUtil, embeddable } = plugins;

    const dashboardCapabilities: Readonly<DashboardCapabilities> = application.capabilities
      .dashboard as DashboardCapabilities;

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
      const addToLibraryAction = new AddToLibraryAction({
        toasts: notifications.toasts,
        capabilities: application.capabilities,
      });
      uiActions.registerAction(addToLibraryAction);
      uiActions.attachAction(CONTEXT_MENU_TRIGGER, addToLibraryAction.id);

      const unlinkFromLibraryAction = new UnlinkFromLibraryAction({ toasts: notifications.toasts });
      uiActions.registerAction(unlinkFromLibraryAction);
      uiActions.attachAction(CONTEXT_MENU_TRIGGER, unlinkFromLibraryAction.id);

      const libraryNotificationAction = new LibraryNotificationAction(unlinkFromLibraryAction);
      uiActions.registerAction(libraryNotificationAction);
      uiActions.attachAction(PANEL_NOTIFICATION_TRIGGER, libraryNotificationAction.id);

      const copyToDashboardAction = new CopyToDashboardAction(
        overlays,
        embeddable.getStateTransfer(),
        {
          canCreateNew: Boolean(dashboardCapabilities.createNew),
          canEditExisting: Boolean(dashboardCapabilities.showWriteControls),
        },
        presentationUtil.ContextProvider
      );
      uiActions.registerAction(copyToDashboardAction);
      uiActions.attachAction(CONTEXT_MENU_TRIGGER, copyToDashboardAction.id);
    }

    const savedDashboardLoader = createSavedDashboardLoader({
      savedObjectsClient: core.savedObjects.client,
      savedObjects: plugins.savedObjects,
      embeddableStart: plugins.embeddable,
    });

    return {
      getSavedDashboardLoader: () => savedDashboardLoader,
      getDashboardContainerByValueRenderer: () => {
        const dashboardContainerFactory = plugins.embeddable.getEmbeddableFactory(
          DASHBOARD_CONTAINER_TYPE
        );

        if (!dashboardContainerFactory) {
          throw new Error(`${DASHBOARD_CONTAINER_TYPE} Embeddable Factory not found`);
        }

        return createDashboardContainerByValueRenderer({
          factory: dashboardContainerFactory as DashboardContainerFactory,
        });
      },
      dashboardUrlGenerator: this.dashboardUrlGenerator,
      dashboardFeatureFlagConfig: this.dashboardFeatureFlagConfig!,
    };
  }

  public stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
