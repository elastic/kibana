/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import {
  App,
  Plugin,
  AppUpdater,
  ScopedHistory,
  type CoreSetup,
  type CoreStart,
  AppMountParameters,
  DEFAULT_APP_CATEGORIES,
  PluginInitializerContext,
  SavedObjectsClientContract,
} from '@kbn/core/public';
import type {
  ScreenshotModePluginSetup,
  ScreenshotModePluginStart,
} from '@kbn/screenshot-mode-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { replaceUrlHashQuery } from '@kbn/kibana-utils-plugin/common';
import { createKbnUrlTracker } from '@kbn/kibana-utils-plugin/public';
import type { SavedObjectsStart } from '@kbn/saved-objects-plugin/public';
import type { VisualizationsStart } from '@kbn/visualizations-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UrlForwardingSetup, UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';

import { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import { DashboardContainerFactoryDefinition } from './dashboard_container/embeddable/dashboard_container_factory';
import {
  type DashboardAppLocator,
  DashboardAppLocatorDefinition,
} from './dashboard_app/locator/locator';
import {
  DASHBOARD_APP_ID,
  LANDING_PAGE_PATH,
  LEGACY_DASHBOARD_APP_ID,
  SEARCH_SESSION_ID,
} from './dashboard_constants';
import { PlaceholderEmbeddableFactory } from './placeholder_embeddable';
import { DashboardMountContextProps } from './dashboard_app/types';

export interface DashboardFeatureFlagConfig {
  allowByValueEmbeddables: boolean;
}

export interface DashboardSetupDependencies {
  data: DataPublicPluginSetup;
  embeddable: EmbeddableSetup;
  home?: HomePublicPluginSetup;
  screenshotMode: ScreenshotModePluginSetup;
  share?: SharePluginSetup;
  usageCollection?: UsageCollectionSetup;
  uiActions: UiActionsSetup;
  urlForwarding: UrlForwardingSetup;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface DashboardStartDependencies {
  data: DataPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStartContract;
  navigation: NavigationPublicPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  savedObjects: SavedObjectsStart;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  screenshotMode: ScreenshotModePluginStart;
  share?: SharePluginStart;
  spaces?: SpacesPluginStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  urlForwarding: UrlForwardingStart;
  usageCollection?: UsageCollectionStart;
  visualizations: VisualizationsStart;
  customBranding: CustomBrandingStart;
}

export interface DashboardSetup {
  locator?: DashboardAppLocator;
}

export interface DashboardStart {
  locator?: DashboardAppLocator;
  dashboardFeatureFlagConfig: DashboardFeatureFlagConfig;
}

export class DashboardPlugin
  implements
    Plugin<DashboardSetup, DashboardStart, DashboardSetupDependencies, DashboardStartDependencies>
{
  constructor(private initializerContext: PluginInitializerContext) {}

  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;
  private currentHistory: ScopedHistory | undefined = undefined;
  private dashboardFeatureFlagConfig?: DashboardFeatureFlagConfig;
  private locator?: DashboardAppLocator;

  private async startDashboardKibanaServices(
    coreStart: CoreStart,
    startPlugins: DashboardStartDependencies,
    initContext: PluginInitializerContext
  ) {
    const { registry, pluginServices } = await import('./services/plugin_services');
    pluginServices.setRegistry(registry.start({ coreStart, startPlugins, initContext }));
  }

  public setup(
    core: CoreSetup<DashboardStartDependencies, DashboardStart>,
    { share, embeddable, home, urlForwarding, data }: DashboardSetupDependencies
  ): DashboardSetup {
    this.dashboardFeatureFlagConfig =
      this.initializerContext.config.get<DashboardFeatureFlagConfig>();

    if (share) {
      this.locator = share.url.locators.create(
        new DashboardAppLocatorDefinition({
          useHashedUrl: core.uiSettings.get('state:storeInSessionStorage'),
          getDashboardFilterFields: async (dashboardId: string) => {
            const { pluginServices } = await import('./services/plugin_services');
            const {
              dashboardSavedObject: { loadDashboardStateFromSavedObject },
            } = pluginServices.getServices();
            return (
              (await loadDashboardStateFromSavedObject({ id: dashboardId })).dashboardInput
                ?.filters ?? []
            );
          },
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
      defaultSubUrl: `#${LANDING_PAGE_PATH}`,
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
            map(async ({ state }) => {
              const { isFilterPinned } = await import('@kbn/es-query');
              return {
                ...state,
                filters: state.filters?.filter(isFilterPinned),
              };
            })
          ),
        },
      ],
      getHistory: () => this.currentHistory!,
      onBeforeNavLinkSaved: (newNavLink: string) => {
        // Do not save SEARCH_SESSION_ID into nav link, because of possible edge cases
        // that could lead to session restoration failure.
        // see: https://github.com/elastic/kibana/issues/87149

        // We also don't want to store the table list view state.
        // The question is: what _do_ we want to save here? :)
        const tableListUrlState = ['s', 'title', 'sort', 'sortdir'];
        return replaceUrlHashQuery(newNavLink, (query) => {
          [SEARCH_SESSION_ID, ...tableListUrlState].forEach((param) => {
            delete query[param];
          });
          return query;
        });
      },
    });

    core.getStartServices().then(([, deps]) => {
      const dashboardContainerFactory = new DashboardContainerFactoryDefinition(deps.embeddable);
      embeddable.registerEmbeddableFactory(
        dashboardContainerFactory.type,
        dashboardContainerFactory
      );

      const placeholderFactory = new PlaceholderEmbeddableFactory();
      embeddable.registerEmbeddableFactory(placeholderFactory.type, placeholderFactory);
    });

    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    const app: App = {
      id: DASHBOARD_APP_ID,
      title: 'Dashboard',
      order: 2500,
      euiIconType: 'logoKibana',
      defaultPath: `#${LANDING_PAGE_PATH}`,
      updater$: this.appStateUpdater,
      category: DEFAULT_APP_CATEGORIES.kibana,
      mount: async (params: AppMountParameters) => {
        this.currentHistory = params.history;
        params.element.classList.add(APP_WRAPPER_CLASS);
        const { mountApp } = await import('./dashboard_app/dashboard_router');
        appMounted();

        const mountContext: DashboardMountContextProps = {
          restorePreviousUrl,
          scopedHistory: () => this.currentHistory!,
          onAppLeave: params.onAppLeave,
          setHeaderActionMenu: params.setHeaderActionMenu,
        };

        return mountApp({
          core,
          appUnMounted,
          element: params.element,
          mountContext,
        });
      },
    };

    core.application.register(app);
    urlForwarding.forwardApp(DASHBOARD_APP_ID, DASHBOARD_APP_ID, (path) => {
      const [, tail] = /(\?.*)/.exec(path) || [];
      // carry over query if it exists
      return `#/list${tail || ''}`;
    });
    urlForwarding.forwardApp(LEGACY_DASHBOARD_APP_ID, DASHBOARD_APP_ID, (path) => {
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
    });

    if (home) {
      home.featureCatalogue.register({
        id: LEGACY_DASHBOARD_APP_ID,
        title: i18n.translate('dashboard.featureCatalogue.dashboardTitle', {
          defaultMessage: 'Dashboard',
        }),
        subtitle: i18n.translate('dashboard.featureCatalogue.dashboardSubtitle', {
          defaultMessage: 'Analyze data in dashboards.',
        }),
        description: i18n.translate('dashboard.featureCatalogue.dashboardDescription', {
          defaultMessage: 'Display and share a collection of visualizations and saved searches.',
        }),
        icon: 'dashboardApp',
        path: `/app/dashboards#${LANDING_PAGE_PATH}`,
        showOnHomePage: false,
        category: 'data',
        solutionId: 'kibana',
        order: 100,
      });
    }

    return {
      locator: this.locator,
    };
  }

  public start(core: CoreStart, plugins: DashboardStartDependencies): DashboardStart {
    this.startDashboardKibanaServices(core, plugins, this.initializerContext).then(async () => {
      const { buildAllDashboardActions } = await import('./dashboard_actions');
      buildAllDashboardActions({
        core,
        plugins,
        allowByValueEmbeddables: this.dashboardFeatureFlagConfig?.allowByValueEmbeddables,
      });
    });

    return {
      locator: this.locator,
      dashboardFeatureFlagConfig: this.dashboardFeatureFlagConfig!,
    };
  }

  public stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
