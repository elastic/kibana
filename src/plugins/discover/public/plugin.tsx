/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { ComponentType } from 'react';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import { SharePluginStart, SharePluginSetup } from '@kbn/share-plugin/public';
import { UrlForwardingSetup, UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { Start as InspectorPublicPluginStart } from '@kbn/inspector-plugin/public';
import { EuiSkeletonText } from '@elastic/eui';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { SavedObjectsStart } from '@kbn/saved-objects-plugin/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { DOC_TABLE_LEGACY, TRUNCATE_MAX_HEIGHT } from '@kbn/discover-utils';
import { PLUGIN_ID } from '../common';
import { DocViewInput, DocViewInputFn } from './services/doc_views/doc_views_types';
import { DocViewsRegistry } from './services/doc_views/doc_views_registry';
import {
  setDocViewsRegistry,
  setHeaderActionMenuMounter,
  setScopedHistory,
  setUiActions,
  setUrlTracker,
  syncHistoryLocations,
} from './kibana_services';
import { registerFeature } from './register_feature';
import { buildServices } from './build_services';
import { SearchEmbeddableFactory } from './embeddable';
import { DeferredSpinner } from './components';
import { ViewSavedSearchAction } from './embeddable/view_saved_search_action';
import { injectTruncateStyles } from './utils/truncate_styles';
import { useDiscoverServices } from './hooks/use_discover_services';
import { initializeKbnUrlTracking } from './utils/initialize_kbn_url_tracking';
import {
  DiscoverContextAppLocator,
  DiscoverContextAppLocatorDefinition,
} from './application/context/services/locator';
import {
  DiscoverSingleDocLocator,
  DiscoverSingleDocLocatorDefinition,
} from './application/doc/locator';
import { DiscoverAppLocator, DiscoverAppLocatorDefinition } from '../common';
import type { RegisterCustomizationProfile } from './customizations';
import {
  createRegisterCustomizationProfile,
  createProfileRegistry,
} from './customizations/profile_registry';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER } from './embeddable/constants';
import { DiscoverContainerInternal, DiscoverContainerProps } from './components/discover_container';

const DocViewerLegacyTable = React.lazy(
  () => import('./services/doc_views/components/doc_viewer_table/legacy')
);
const DocViewerTable = React.lazy(() => import('./services/doc_views/components/doc_viewer_table'));
const SourceViewer = React.lazy(() => import('./services/doc_views/components/doc_viewer_source'));

/**
 * @public
 */
export interface DiscoverSetup {
  docViews: {
    /**
     * Add new doc view shown along with table view and json view in the details of each document in Discover.
     * @param docViewRaw
     */
    addDocView(docViewRaw: DocViewInput | DocViewInputFn): void;
  };

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
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
  embeddable: EmbeddableSetup;
  urlForwarding: UrlForwardingSetup;
  home?: HomePublicPluginSetup;
  data: DataPublicPluginSetup;
  expressions: ExpressionsSetup;
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
  savedObjects: SavedObjectsStart;
  usageCollection?: UsageCollectionSetup;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  spaces?: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  expressions: ExpressionsStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedSearch: SavedSearchPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  lens: LensPublicStart;
}

/**
 * Contains Discover, one of the oldest parts of Kibana
 * Discover provides embeddables for Dashboards
 */
export class DiscoverPlugin
  implements Plugin<DiscoverSetup, DiscoverStart, DiscoverSetupPlugins, DiscoverStartPlugins>
{
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private docViewsRegistry: DocViewsRegistry | null = null;
  private stopUrlTracking: (() => void) | undefined = undefined;
  private profileRegistry = createProfileRegistry();
  private locator?: DiscoverAppLocator;
  private contextLocator?: DiscoverContextAppLocator;
  private singleDocLocator?: DiscoverSingleDocLocator;

  setup(core: CoreSetup<DiscoverStartPlugins, DiscoverStart>, plugins: DiscoverSetupPlugins) {
    const baseUrl = core.http.basePath.prepend('/app/discover');
    const isDev = this.initializerContext.env.mode.dev;

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

    this.docViewsRegistry = new DocViewsRegistry();
    setDocViewsRegistry(this.docViewsRegistry);
    this.docViewsRegistry.addDocView({
      title: i18n.translate('discover.docViews.table.tableTitle', {
        defaultMessage: 'Table',
      }),
      order: 10,
      component: (props) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const services = useDiscoverServices();
        const DocView = services.uiSettings.get(DOC_TABLE_LEGACY)
          ? DocViewerLegacyTable
          : DocViewerTable;

        return (
          <React.Suspense
            fallback={
              <DeferredSpinner>
                <EuiSkeletonText />
              </DeferredSpinner>
            }
          >
            <DocView {...props} />
          </React.Suspense>
        );
      },
    });
    this.docViewsRegistry.addDocView({
      title: i18n.translate('discover.docViews.json.jsonTitle', {
        defaultMessage: 'JSON',
      }),
      order: 20,
      component: ({ hit, dataView, query, textBasedHits }) => {
        return (
          <React.Suspense
            fallback={
              <DeferredSpinner>
                <EuiSkeletonText />
              </DeferredSpinner>
            }
          >
            <SourceViewer
              index={hit.raw._index}
              id={hit.raw._id ?? hit.id}
              dataView={dataView}
              textBasedHits={textBasedHits}
              hasLineNumbers
            />
          </React.Suspense>
        );
      },
    });

    const {
      setTrackedUrl,
      restorePreviousUrl,
      stopUrlTracker,
      appMounted,
      appUnMounted,
      setTrackingEnabled,
    } = initializeKbnUrlTracking(baseUrl, core, this.appStateUpdater, plugins);
    setUrlTracker({ setTrackedUrl, restorePreviousUrl, setTrackingEnabled });
    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

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
      mount: async (params: AppMountParameters) => {
        const [coreStart, discoverStartPlugins] = await core.getStartServices();
        setScopedHistory(params.history);
        setHeaderActionMenuMounter(params.setHeaderActionMenu);
        syncHistoryLocations();
        appMounted();

        // dispatch synthetic hash change event to update hash history objects
        // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
        const unlistenParentHistory = params.history.listen(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });

        const { locator, contextLocator, singleDocLocator } = await getProfileAwareLocators({
          locator: this.locator!,
          contextLocator: this.contextLocator!,
          singleDocLocator: this.singleDocLocator!,
        });

        const services = buildServices(
          coreStart,
          discoverStartPlugins,
          this.initializerContext,
          locator,
          contextLocator,
          singleDocLocator
        );

        // make sure the data view list is up to date
        await discoverStartPlugins.dataViews.clearCache();

        const { renderApp } = await import('./application');
        // FIXME: Temporarily hide overflow-y in Discover app when Field Stats table is shown
        // due to EUI bug https://github.com/elastic/eui/pull/5152
        params.element.classList.add('dscAppWrapper');
        const unmount = renderApp({
          element: params.element,
          services,
          profileRegistry: this.profileRegistry,
          isDev,
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
      docViews: {
        addDocView: this.docViewsRegistry.addDocView.bind(this.docViewsRegistry),
      },
      locator: this.locator,
    };
  }

  start(core: CoreStart, plugins: DiscoverStartPlugins) {
    // we need to register the application service at setup, but to render it
    // there are some start dependencies necessary, for this reason
    // initializeServices are assigned at start and used
    // when the application/embeddable is mounted

    const viewSavedSearchAction = new ViewSavedSearchAction(core.application);

    plugins.uiActions.addTriggerAction('CONTEXT_MENU_TRIGGER', viewSavedSearchAction);
    plugins.uiActions.registerTrigger(SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER);
    setUiActions(plugins.uiActions);
    injectTruncateStyles(core.uiSettings.get(TRUNCATE_MAX_HEIGHT));

    const isDev = this.initializerContext.env.mode.dev;

    const getDiscoverServicesInternal = () => {
      return this.getDiscoverServices(core, plugins);
    };

    return {
      locator: this.locator,
      DiscoverContainer: ({ overrideServices, ...restProps }: DiscoverContainerProps) => {
        return (
          <DiscoverContainerInternal
            overrideServices={overrideServices}
            getDiscoverServices={getDiscoverServicesInternal}
            isDev={isDev}
            {...restProps}
          />
        );
      },
      registerCustomizationProfile: createRegisterCustomizationProfile(this.profileRegistry),
    };
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }

  private getDiscoverServices = async (core: CoreStart, plugins: DiscoverStartPlugins) => {
    const { locator, contextLocator, singleDocLocator } = await getProfileAwareLocators({
      locator: this.locator!,
      contextLocator: this.contextLocator!,
      singleDocLocator: this.singleDocLocator!,
    });

    return buildServices(
      core,
      plugins,
      this.initializerContext,
      locator,
      contextLocator,
      singleDocLocator
    );
  };

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

/**
 * Create profile-aware locators for internal use
 */
const getProfileAwareLocators = async ({
  locator,
  contextLocator,
  singleDocLocator,
}: {
  locator: DiscoverAppLocator;
  contextLocator: DiscoverContextAppLocator;
  singleDocLocator: DiscoverSingleDocLocator;
}) => {
  const { ProfileAwareLocator } = await import('./customizations/profile_aware_locator');

  return {
    locator: new ProfileAwareLocator(locator),
    contextLocator: new ProfileAwareLocator(contextLocator),
    singleDocLocator: new ProfileAwareLocator(singleDocLocator),
  };
};
