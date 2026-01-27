/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, filter, map } from 'rxjs';

import type {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import type {
  App,
  AppMountParameters,
  AppUpdater,
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
} from '@kbn/core/public';
import {
  APP_WRAPPER_CLASS,
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
} from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public/plugin';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { i18n } from '@kbn/i18n';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { replaceUrlHashQuery } from '@kbn/kibana-utils-plugin/common';
import { createKbnUrlTracker } from '@kbn/kibana-utils-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type {
  ScreenshotModePluginSetup,
  ScreenshotModePluginStart,
} from '@kbn/screenshot-mode-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { type UiActionsSetup, type UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UrlForwardingSetup, UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';

import { DashboardAppLocatorDefinition } from '../common/locator/locator';
import type { DashboardMountContextProps } from './dashboard_app/types';
import {
  DASHBOARD_APP_ID,
  LANDING_PAGE_PATH,
  SEARCH_SESSION_ID,
} from '../common/page_bundle_constants';
import { setKibanaServices, untilPluginStartServicesReady } from './services/kibana_services';
import { setLogger } from './services/logger';
import { registerActions } from './dashboard_actions/register_actions';
import { setupUrlForwarding } from './dashboard_app/url/setup_url_forwarding';
import type { FindDashboardsService } from './dashboard_client';
import { DASHBOARD_DURATION_START_MARK } from './dashboard_api/performance/dashboard_duration_start_mark';

export interface DashboardSetupDependencies {
  data: DataPublicPluginSetup;
  embeddable: EmbeddableSetup;
  home?: HomePublicPluginSetup;
  contentManagement: ContentManagementPublicSetup;
  screenshotMode: ScreenshotModePluginSetup;
  share?: SharePluginSetup;
  usageCollection?: UsageCollectionSetup;
  uiActions: UiActionsSetup;
  urlForwarding: UrlForwardingSetup;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
  lens?: LensPublicSetup;
}

export interface DashboardStartDependencies {
  data: DataPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  embeddable: EmbeddableStart;
  fieldFormats: FieldFormatsStart;
  inspector: InspectorStartContract;
  navigation: NavigationPublicPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  contentManagement: ContentManagementPublicStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  screenshotMode: ScreenshotModePluginStart;
  share?: SharePluginStart;
  spaces?: SpacesPluginStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  urlForwarding: UrlForwardingStart;
  usageCollection?: UsageCollectionStart;
  customBranding: CustomBrandingStart;
  serverless?: ServerlessPluginStart;
  noDataPage?: NoDataPagePluginStart;
  lens?: LensPublicStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  cps?: CPSPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DashboardSetup {}

/**
 * The start contract for the Dashboard plugin.
 * Provides services for interacting with dashboards from other plugins.
 */
export interface DashboardStart {
  /**
   * Returns the service for finding dashboards.
   *
   * @returns A promise that resolves to the {@link FindDashboardsService}.
   */
  findDashboardsService: () => Promise<FindDashboardsService>;
}

export class DashboardPlugin
  implements
    Plugin<DashboardSetup, DashboardStart, DashboardSetupDependencies, DashboardStartDependencies>
{
  constructor(initializerContext: PluginInitializerContext) {
    setLogger(initializerContext.logger.get('dashboard'));
  }

  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;
  private currentHistory: ScopedHistory | undefined = undefined;

  public setup(
    core: CoreSetup<DashboardStartDependencies, DashboardStart>,
    { share, home, data, urlForwarding }: DashboardSetupDependencies
  ) {
    core.analytics.registerEventType({
      eventType: 'dashboard_loaded_with_data',
      schema: {},
    });

    if (share) {
      share.url.locators.create(
        new DashboardAppLocatorDefinition({
          useHashedUrl: core.uiSettings.get('state:storeInSessionStorage'),
          getDashboardFilterFields: async (dashboardId: string) => {
            const [{ dashboardClient }] = await Promise.all([
              import('./dashboard_client'),
              untilPluginStartServicesReady(),
            ]);

            const result = await dashboardClient.get(dashboardId);
            return result.data.filters ?? [];
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
        const tableListUrlState = ['s', 'title', 'sort', 'sortdir', 'created_by', 'favorites'];
        return replaceUrlHashQuery(newNavLink, (query) => {
          [SEARCH_SESSION_ID, ...tableListUrlState].forEach((param) => {
            delete query[param];
          });
          return query;
        });
      },
    });

    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    const app: App = {
      id: DASHBOARD_APP_ID,
      title: 'Dashboards',
      order: 2500,
      euiIconType: 'logoKibana',
      defaultPath: `#${LANDING_PAGE_PATH}`,
      updater$: this.appStateUpdater,
      category: DEFAULT_APP_CATEGORIES.kibana,
      mount: async (params: AppMountParameters) => {
        performance.mark(DASHBOARD_DURATION_START_MARK);
        this.currentHistory = params.history;
        params.element.classList.add(APP_WRAPPER_CLASS);
        const [{ mountApp }] = await Promise.all([
          import('./dashboard_app/dashboard_router'),
          import('./dashboard_renderer/dashboard_module'),
          untilPluginStartServicesReady(),
        ]);
        appMounted();

        const [coreStart] = await core.getStartServices();

        const mountContext: DashboardMountContextProps = {
          restorePreviousUrl,
          scopedHistory: () => this.currentHistory!,
          onAppLeave: params.onAppLeave,
          setHeaderActionMenu: params.setHeaderActionMenu,
        };

        return mountApp({
          coreStart,
          appUnMounted,
          element: params.element,
          mountContext,
        });
      },
    };

    core.application.register(app);

    setupUrlForwarding(urlForwarding);

    const dashboardAppTitle = i18n.translate('dashboard.featureCatalogue.dashboardTitle', {
      defaultMessage: 'Dashboard',
    });

    if (home) {
      home.featureCatalogue.register({
        id: DASHBOARD_APP_ID,
        title: dashboardAppTitle,
        subtitle: i18n.translate('dashboard.featureCatalogue.dashboardSubtitle', {
          defaultMessage: 'Analyze data in dashboards.',
        }),
        description: i18n.translate('dashboard.featureCatalogue.dashboardDescription', {
          defaultMessage: 'Display and share a collection of visualizations and search results.',
        }),
        icon: 'dashboardApp',
        path: `/app/${DASHBOARD_APP_ID}#${LANDING_PAGE_PATH}`,
        showOnHomePage: false,
        category: 'data',
        solutionId: 'kibana',
        order: 100,
      });
    }

    return {};
  }

  public start(core: CoreStart, plugins: DashboardStartDependencies): DashboardStart {
    setKibanaServices(core, plugins);

    registerActions(plugins);

    plugins.uiActions.registerActionAsync('searchDashboardAction', async () => {
      const { searchAction } = await import('./dashboard_client');
      return searchAction;
    });

    plugins.uiActions.registerActionAsync('getDashboardsByIdsAction', async () => {
      const { getDashboardsByIdsAction } = await import('./dashboard_client');
      return getDashboardsByIdsAction;
    });

    return {
      findDashboardsService: async () => {
        const { findService } = await import('./dashboard_client');
        return findService;
      },
    };
  }

  public stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
