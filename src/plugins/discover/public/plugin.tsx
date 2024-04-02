/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentType } from 'react';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
} from '@kbn/core/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/public';
import { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import { SharePluginStart, SharePluginSetup } from '@kbn/share-plugin/public';
import { UrlForwardingSetup, UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { Start as InspectorPublicPluginStart } from '@kbn/inspector-plugin/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { TRUNCATE_MAX_HEIGHT, ENABLE_ESQL } from '@kbn/discover-utils';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import { PLUGIN_ID } from '../common';
import { registerFeature } from './register_feature';
import { buildServices, UrlTracker } from './build_services';
import { SearchEmbeddableFactory } from './embeddable';
import { ViewSavedSearchAction } from './embeddable/view_saved_search_action';
import { injectTruncateStyles } from './utils/truncate_styles';
import { initializeKbnUrlTracking } from './utils/initialize_kbn_url_tracking';
import {
  DiscoverContextAppLocator,
  DiscoverContextAppLocatorDefinition,
} from './application/context/services/locator';
import {
  DiscoverSingleDocLocator,
  DiscoverSingleDocLocatorDefinition,
} from './application/doc/locator';
import {
  DiscoverAppLocator,
  DiscoverAppLocatorDefinition,
  DiscoverESQLLocatorDefinition,
} from '../common';
import type { DiscoverCustomizationContext, RegisterCustomizationProfile } from './customizations';
import {
  createRegisterCustomizationProfile,
  createProfileRegistry,
} from './customizations/profile_registry';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER } from './embeddable/constants';
import {
  DiscoverContainerInternal,
  type DiscoverContainerProps,
} from './components/discover_container';
import { getESQLSearchProvider } from './global_search/search_provider';
import { HistoryService } from './history_service';
import { ConfigSchema, ExperimentalFeatures } from '../common/config';

/**
 * @public
 */
export interface DiscoverSetup {
  /**
   * `share` plugin URL locator for Discover app. Use it to generate links into
   * Discover application, for example, navigate:
   *
   * ```ts
   * await plugins.discover.locator.navigate({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   *
   * Generate a location:
   *
   * ```ts
   * const location = await plugins.discover.locator.getLocation({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   */
  readonly locator: undefined | DiscoverAppLocator;
  readonly showInlineTopNav: (
    options?: Partial<Omit<DiscoverCustomizationContext['inlineTopNav'], 'enabled'>>
  ) => void;
}

export interface DiscoverStart {
  /**
   * `share` plugin URL locator for Discover app. Use it to generate links into
   * Discover application, for example, navigate:
   *
   * ```ts
   * await plugins.discover.locator.navigate({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   *
   * Generate a location:
   *
   * ```ts
   * const location = await plugins.discover.locator.getLocation({
   *   savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
   *   indexPatternId: 'c367b774-a4c2-11ea-bb37-0242ac130002',
   *   timeRange: {
   *     to: 'now',
   *     from: 'now-15m',
   *     mode: 'relative',
   *   },
   * });
   * ```
   */
  readonly locator: undefined | DiscoverAppLocator;
  readonly DiscoverContainer: ComponentType<DiscoverContainerProps>;
  readonly registerCustomizationProfile: RegisterCustomizationProfile;
}

/**
 * @internal
 */
export interface DiscoverSetupPlugins {
  dataViews: DataViewsServicePublic;
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
  embeddable: EmbeddableSetup;
  urlForwarding: UrlForwardingSetup;
  home?: HomePublicPluginSetup;
  data: DataPublicPluginSetup;
  expressions: ExpressionsSetup;
  globalSearch?: GlobalSearchPluginSetup;
}

/**
 * @internal
 */
export interface DiscoverStartPlugins {
  dataViews: DataViewsServicePublic;
  dataViewEditor: DataViewEditorStart;
  uiActions: UiActionsStart;
  embeddable: EmbeddableStart;
  navigation: NavigationStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  share?: SharePluginStart;
  urlForwarding: UrlForwardingStart;
  inspector: InspectorPublicPluginStart;
  usageCollection?: UsageCollectionSetup;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  spaces?: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  expressions: ExpressionsStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedSearch: SavedSearchPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  unifiedDocViewer: UnifiedDocViewerStart;
  lens: LensPublicStart;
  contentManagement: ContentManagementPublicStart;
  noDataPage?: NoDataPagePluginStart;
}

/**
 * Contains Discover, one of the oldest parts of Kibana
 * Discover provides embeddables for Dashboards
 */
export class DiscoverPlugin
  implements Plugin<DiscoverSetup, DiscoverStart, DiscoverSetupPlugins, DiscoverStartPlugins>
{
  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.experimentalFeatures =
      initializerContext.config.get().experimental ?? this.experimentalFeatures;
  }

  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private historyService = new HistoryService();
  private scopedHistory?: ScopedHistory<unknown>;
  private urlTracker?: UrlTracker;
  private stopUrlTracking: (() => void) | undefined = undefined;
  private profileRegistry = createProfileRegistry();
  private locator?: DiscoverAppLocator;
  private contextLocator?: DiscoverContextAppLocator;
  private singleDocLocator?: DiscoverSingleDocLocator;
  private inlineTopNav: DiscoverCustomizationContext['inlineTopNav'] = {
    enabled: false,
    showLogsExplorerTabs: false,
  };
  private experimentalFeatures: ExperimentalFeatures = {
    ruleFormV2Enabled: false,
  };

  setup(
    core: CoreSetup<DiscoverStartPlugins, DiscoverStart>,
    plugins: DiscoverSetupPlugins
  ): DiscoverSetup {
    const baseUrl = core.http.basePath.prepend('/app/discover');

    if (plugins.share) {
      const useHash = core.uiSettings.get('state:storeInSessionStorage');

      // Create locators for external use without profile-awareness
      this.locator = plugins.share.url.locators.create(
        new DiscoverAppLocatorDefinition({ useHash, setStateToKbnUrl })
      );
      this.contextLocator = plugins.share.url.locators.create(
        new DiscoverContextAppLocatorDefinition({ useHash })
      );
      this.singleDocLocator = plugins.share.url.locators.create(
        new DiscoverSingleDocLocatorDefinition()
      );
    }

    if (plugins.globalSearch) {
      const enableESQL = core.uiSettings.get(ENABLE_ESQL);
      plugins.globalSearch.registerResultProvider(
        getESQLSearchProvider(
          enableESQL,
          core.getStartServices().then(
            ([
              {
                application: { capabilities },
              },
            ]) => capabilities
          ),
          core.getStartServices().then((deps) => {
            const { data } = deps[1];
            return data;
          }),
          this.locator
        )
      );
    }

    const {
      setTrackedUrl,
      restorePreviousUrl,
      stopUrlTracker,
      appMounted,
      appUnMounted,
      setTrackingEnabled,
    } = initializeKbnUrlTracking({
      baseUrl,
      core,
      navLinkUpdater$: this.appStateUpdater,
      plugins,
      getScopedHistory: () => this.scopedHistory!,
    });

    this.urlTracker = { setTrackedUrl, restorePreviousUrl, setTrackingEnabled };
    this.stopUrlTracking = stopUrlTracker;

    const appStateUpdater$ = combineLatest([
      this.appStateUpdater,
      this.profileRegistry.getContributedAppState$(),
    ]).pipe(
      map(
        ([urlAppStateUpdater, profileAppStateUpdater]): AppUpdater =>
          (app) => ({
            ...urlAppStateUpdater(app),
            ...profileAppStateUpdater(app),
          })
      )
    );

    core.application.register({
      id: PLUGIN_ID,
      title: 'Discover',
      updater$: appStateUpdater$,
      order: 1000,
      euiIconType: 'logoKibana',
      defaultPath: '#/',
      category: DEFAULT_APP_CATEGORIES.kibana,
      visibleIn: ['globalSearch', 'sideNav', 'kibanaOverview'],
      mount: async (params: AppMountParameters) => {
        const [coreStart, discoverStartPlugins] = await core.getStartServices();

        // Store the current scoped history so initializeKbnUrlTracking can access it
        this.scopedHistory = params.history;

        this.historyService.syncHistoryLocations();
        appMounted();

        // dispatch synthetic hash change event to update hash history objects
        // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
        const unlistenParentHistory = this.scopedHistory.listen(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        const { locator, contextLocator, singleDocLocator } = await this.getProfileAwareLocators({
          locator: this.locator!,
          contextLocator: this.contextLocator!,
          singleDocLocator: this.singleDocLocator!,
        });

        const services = buildServices({
          core: coreStart,
          plugins: discoverStartPlugins,
          context: this.initializerContext,
          locator,
          contextLocator,
          singleDocLocator,
          history: this.historyService.getHistory(),
          scopedHistory: this.scopedHistory,
          urlTracker: this.urlTracker!,
          setHeaderActionMenu: params.setHeaderActionMenu,
        });

        // make sure the data view list is up to date
        discoverStartPlugins.dataViews.clearCache();

        // FIXME: Temporarily hide overflow-y in Discover app when Field Stats table is shown
        // due to EUI bug https://github.com/elastic/eui/pull/5152
        params.element.classList.add('dscAppWrapper');

        const { renderApp } = await import('./application');
        const unmount = renderApp({
          element: params.element,
          services,
          profileRegistry: this.profileRegistry,
          customizationContext: {
            displayMode: 'standalone',
            inlineTopNav: this.inlineTopNav,
          },
          experimentalFeatures: this.experimentalFeatures,
        });

        return () => {
          unlistenParentHistory();
          unmount();
          appUnMounted();
        };
      },
    });

    plugins.urlForwarding.forwardApp('doc', 'discover', (path) => {
      return `#${path}`;
    });
    plugins.urlForwarding.forwardApp('context', 'discover', (path) => {
      const urlParts = path.split('/');
      // take care of urls containing legacy url, those split in the following way
      // ["", "context", indexPatternId, _type, id + params]
      if (urlParts[4]) {
        // remove _type part
        const newPath = [...urlParts.slice(0, 3), ...urlParts.slice(4)].join('/');
        return `#${newPath}`;
      }
      return `#${path}`;
    });
    plugins.urlForwarding.forwardApp('discover', 'discover', (path) => {
      const [, id, tail] = /discover\/([^\?]+)(.*)/.exec(path) || [];
      if (!id) {
        return `#${path.replace('/discover', '') || '/'}`;
      }
      return `#/view/${id}${tail || ''}`;
    });

    if (plugins.home) {
      registerFeature(plugins.home);
    }

    this.registerEmbeddable(core, plugins);

    return {
      locator: this.locator,
      showInlineTopNav: ({ showLogsExplorerTabs } = {}) => {
        this.inlineTopNav.enabled = true;
        this.inlineTopNav.showLogsExplorerTabs = showLogsExplorerTabs ?? false;
      },
    };
  }

  start(core: CoreStart, plugins: DiscoverStartPlugins): DiscoverStart {
    // we need to register the application service at setup, but to render it
    // there are some start dependencies necessary, for this reason
    // initializeServices are assigned at start and used
    // when the application/embeddable is mounted

    const viewSavedSearchAction = new ViewSavedSearchAction(core.application, this.locator!);

    plugins.uiActions.addTriggerAction('CONTEXT_MENU_TRIGGER', viewSavedSearchAction);
    plugins.uiActions.registerTrigger(SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER);
    injectTruncateStyles(core.uiSettings.get(TRUNCATE_MAX_HEIGHT));

    const getDiscoverServicesInternal = () => {
      return this.getDiscoverServices(core, plugins);
    };

    const isEsqlEnabled = core.uiSettings.get(ENABLE_ESQL);

    if (plugins.share && this.locator && isEsqlEnabled) {
      plugins.share?.url.locators.create(
        new DiscoverESQLLocatorDefinition({
          discoverAppLocator: this.locator,
          getIndices: plugins.dataViews.getIndices,
        })
      );
    }

    return {
      locator: this.locator,
      DiscoverContainer: (props: DiscoverContainerProps) => (
        <DiscoverContainerInternal getDiscoverServices={getDiscoverServicesInternal} {...props} />
      ),
      registerCustomizationProfile: createRegisterCustomizationProfile(this.profileRegistry),
    };
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }

  private getDiscoverServices = async (core: CoreStart, plugins: DiscoverStartPlugins) => {
    const { locator, contextLocator, singleDocLocator } = await this.getProfileAwareLocators({
      locator: this.locator!,
      contextLocator: this.contextLocator!,
      singleDocLocator: this.singleDocLocator!,
    });

    return buildServices({
      core,
      plugins,
      context: this.initializerContext,
      locator,
      contextLocator,
      singleDocLocator,
      history: this.historyService.getHistory(),
      urlTracker: this.urlTracker!,
    });
  };

  /**
   * Create profile-aware locators for internal use
   */
  private async getProfileAwareLocators({
    locator,
    contextLocator,
    singleDocLocator,
  }: {
    locator: DiscoverAppLocator;
    contextLocator: DiscoverContextAppLocator;
    singleDocLocator: DiscoverSingleDocLocator;
  }) {
    const { ProfileAwareLocator } = await import('./customizations/profile_aware_locator');
    const history = this.historyService.getHistory();

    return {
      locator: new ProfileAwareLocator(locator, history),
      contextLocator: new ProfileAwareLocator(contextLocator, history),
      singleDocLocator: new ProfileAwareLocator(singleDocLocator, history),
    };
  }

  private registerEmbeddable(core: CoreSetup<DiscoverStartPlugins>, plugins: DiscoverSetupPlugins) {
    const getStartServices = async () => {
      const [coreStart, deps] = await core.getStartServices();
      return {
        executeTriggerActions: deps.uiActions.executeTriggerActions,
        isEditable: () => coreStart.application.capabilities.discover.save as boolean,
      };
    };

    const getDiscoverServicesInternal = async () => {
      const [coreStart, deps] = await core.getStartServices();
      return this.getDiscoverServices(coreStart, deps);
    };

    const factory = new SearchEmbeddableFactory(getStartServices, getDiscoverServicesInternal);
    plugins.embeddable.registerEmbeddableFactory(factory.type, factory);
  }
}
