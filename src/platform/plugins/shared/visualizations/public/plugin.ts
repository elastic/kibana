/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { filter, map } from 'rxjs';
import { createHashHistory } from 'history';
import { BehaviorSubject } from 'rxjs';
import {
  AppMountParameters,
  AppUpdater,
  DEFAULT_APP_CATEGORIES,
  ScopedHistory,
} from '@kbn/core/public';

import {
  createKbnUrlStateStorage,
  createKbnUrlTracker,
  createStartServicesGetter,
  Storage,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';
import { replaceUrlHashQuery } from '@kbn/kibana-utils-plugin/common';

import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  ApplicationStart,
  SavedObjectsClientContract,
} from '@kbn/core/public';
import { UiActionsStart, UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '@kbn/inspector-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { UrlForwardingSetup, UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';

import type { TypesSetup, TypesStart } from './vis_types';
import type { VisualizeServices } from './visualize_app/types';
import {
  aggBasedVisualizationTrigger,
  dashboardVisualizationPanelTrigger,
  visualizeEditorTrigger,
} from './triggers';
import { createVisEditorsRegistry, VisEditorsRegistry } from './vis_editors_registry';
import { showNewVisModal } from './wizard';
import { VisualizeLocatorDefinition } from '../common/locator';
import { xyDimension as xyDimensionExpressionFunction } from '../common/expression_functions/xy_dimension';
import { visDimension as visDimensionExpressionFunction } from '../common/expression_functions/vis_dimension';
import { range as rangeExpressionFunction } from '../common/expression_functions/range';
import { TypesService } from './vis_types/types_service';
import {
  setUISettings,
  setTypes,
  setApplication,
  setCapabilities,
  setHttp,
  setSearch,
  setSavedObjects,
  setExpressions,
  setUiActions,
  setTimeFilter,
  setAggs,
  setChrome,
  setOverlays,
  setEmbeddable,
  setDocLinks,
  setSpaces,
  setAnalytics,
  setI18n,
  setTheme,
  setUserProfile,
  setExecutionContext,
  setFieldFormats,
  setSavedObjectTagging,
  setUsageCollection,
  setSavedObjectsManagement,
  setContentManagement,
  setSavedSearch,
  setDataViews,
  setInspector,
  getTypes,
  setNotifications,
} from './services';
import { VisualizeConstants, VISUALIZE_EMBEDDABLE_TYPE } from '../common/constants';
import { ListingViewRegistry } from './types';
import {
  LATEST_VERSION,
  CONTENT_ID,
  VisualizationSavedObjectAttributes,
} from '../common/content_management';
import type { VisualizeSerializedState } from './embeddable/types';
import { registerActions } from './actions/register_actions';

/**
 * Interface for this plugin's returned setup/start contracts.
 *
 * @public
 */

export type VisualizationsSetup = TypesSetup & {
  visEditorsRegistry: VisEditorsRegistry;
  listingViewRegistry: ListingViewRegistry;
};
export interface VisualizationsStart extends TypesStart {
  showNewVisModal: typeof showNewVisModal;
}

export interface VisualizationsSetupDeps {
  data: DataPublicPluginSetup;
  embeddable: EmbeddableSetup;
  expressions: ExpressionsSetup;
  inspector: InspectorSetup;
  uiActions: UiActionsSetup;
  urlForwarding: UrlForwardingSetup;
  home?: HomePublicPluginSetup;
  share?: SharePluginSetup;
  contentManagement: ContentManagementPublicSetup;
}

export interface VisualizationsStartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  expressions: ExpressionsStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  uiActions: UiActionsStart;
  application: ApplicationStart;
  navigation: NavigationStart;
  presentationUtil: PresentationUtilPluginStart;
  savedObjectsClient: SavedObjectsClientContract;
  savedSearch: SavedSearchPublicPluginStart;
  spaces?: SpacesPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  share?: SharePluginStart;
  urlForwarding: UrlForwardingStart;
  screenshotMode: ScreenshotModePluginStart;
  fieldFormats: FieldFormatsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  usageCollection: UsageCollectionStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  contentManagement: ContentManagementPublicStart;
  serverless?: ServerlessPluginStart;
  noDataPage?: NoDataPagePluginStart;
  embeddableEnhanced?: EmbeddableEnhancedPluginStart;
}

/**
 * Visualizations Plugin - public
 *
 * This plugin's stateful contracts are returned from the `setup` and `start` methods
 * below. The interfaces for these contracts are provided above.
 *
 * @internal
 */
export class VisualizationsPlugin
  implements
    Plugin<
      VisualizationsSetup,
      VisualizationsStart,
      VisualizationsSetupDeps,
      VisualizationsStartDeps
    >
{
  private readonly types: TypesService = new TypesService();
  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;
  private currentHistory: ScopedHistory | undefined = undefined;
  private isLinkedToOriginatingApp: (() => boolean) | undefined = undefined;

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<VisualizationsStartDeps, VisualizationsStart>,
    {
      expressions,
      embeddable,
      data,
      home,
      urlForwarding,
      share,
      uiActions,
      contentManagement,
    }: VisualizationsSetupDeps
  ): VisualizationsSetup {
    const {
      appMounted,
      appUnMounted,
      stop: stopUrlTracker,
      setActiveUrl,
      restorePreviousUrl,
    } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend(VisualizeConstants.VISUALIZE_BASE_PATH),
      defaultSubUrl: '#/',
      storageKey: `lastUrl:${core.http.basePath.get()}:visualize`,
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
              filters: data.query.filterManager.getGlobalFilters(),
            }))
          ),
        },
      ],
      getHistory: () => this.currentHistory!,
      onBeforeNavLinkSaved: (urlToSave: string) => {
        if (this.isLinkedToOriginatingApp?.()) {
          return core.http.basePath.prepend(VisualizeConstants.VISUALIZE_BASE_PATH);
        }
        const tableListUrlState = ['s', 'title', 'sort', 'sortdir'];
        return replaceUrlHashQuery(urlToSave, (query) => {
          tableListUrlState.forEach((param) => {
            delete query[param];
          });
          return query;
        });
      },
    });
    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    const start = createStartServicesGetter(core.getStartServices);
    const listingViewRegistry: ListingViewRegistry = new Set();
    const visEditorsRegistry = createVisEditorsRegistry();

    core.application.register({
      id: VisualizeConstants.APP_ID,
      title: 'Visualize Library',
      order: 8000,
      euiIconType: 'logoKibana',
      defaultPath: '#/',
      category: DEFAULT_APP_CATEGORIES.kibana,
      updater$: this.appStateUpdater.asObservable(),
      // remove all references to visualize
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        this.currentHistory = params.history;

        // allows the urlTracker to only save URLs that are not linked to an originatingApp
        this.isLinkedToOriginatingApp = () => {
          return Boolean(
            pluginsStart.embeddable
              .getStateTransfer()
              .getIncomingEditorState(VisualizeConstants.APP_ID)?.originatingApp
          );
        };

        // make sure the index pattern list is up to date
        pluginsStart.dataViews.clearCache();

        appMounted();

        // dispatch synthetic hash change event to update hash history objects
        // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
        const unlistenParentHistory = params.history.listen(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
        /**
         * current implementation uses 2 history objects:
         * 1. the hash history (used for the react hash router)
         * 2. and the scoped history (used for url tracking)
         * this should be replaced to use only scoped history after moving legacy apps to browser routing
         */
        const history = createHashHistory();
        const [{ createVisEmbeddableFromObject }, { renderApp }] = await Promise.all([
          import('./legacy/embeddable'),
          import('./visualize_app'),
        ]);
        const services: VisualizeServices = {
          ...coreStart,
          history,
          kbnUrlStateStorage: createKbnUrlStateStorage({
            history,
            useHash: coreStart.uiSettings.get('state:storeInSessionStorage'),
            ...withNotifyOnErrors(coreStart.notifications.toasts),
          }),
          urlForwarding: pluginsStart.urlForwarding,
          pluginInitializerContext: this.initializerContext,
          chrome: coreStart.chrome,
          data: pluginsStart.data,
          core: coreStart,
          dataViewEditor: pluginsStart.dataViewEditor,
          dataViews: pluginsStart.dataViews,
          localStorage: new Storage(localStorage),
          navigation: pluginsStart.navigation,
          share: pluginsStart.share,
          toastNotifications: coreStart.notifications.toasts,
          visualizeCapabilities: coreStart.application.capabilities.visualize_v2,
          dashboardCapabilities: coreStart.application.capabilities.dashboard_v2,
          embeddable: pluginsStart.embeddable,
          stateTransferService: pluginsStart.embeddable.getStateTransfer(),
          setActiveUrl,
          /** @deprecated */
          createVisEmbeddableFromObject: createVisEmbeddableFromObject({ start }),
          scopedHistory: params.history,
          restorePreviousUrl,
          setHeaderActionMenu: params.setHeaderActionMenu,
          savedObjectsTagging: pluginsStart.savedObjectsTaggingOss?.getTaggingApi(),
          savedSearch: pluginsStart.savedSearch,
          presentationUtil: pluginsStart.presentationUtil,
          getKibanaVersion: () => this.initializerContext.env.packageInfo.version,
          spaces: pluginsStart.spaces,
          visEditorsRegistry,
          listingViewRegistry,
          unifiedSearch: pluginsStart.unifiedSearch,
          serverless: pluginsStart.serverless,
          noDataPage: pluginsStart.noDataPage,
          contentManagement: pluginsStart.contentManagement,
        };

        params.element.classList.add('visAppWrapper');
        if (pluginsStart.screenshotMode.isScreenshotMode()) {
          params.element.classList.add('visEditorScreenshotModeActive');
          // @ts-expect-error TS error, cannot find type declaration for scss
          await import('./visualize_screenshot_mode.scss');
        }
        const unmount = renderApp(params, services);
        return () => {
          data.search.session.clear();
          params.element.classList.remove('visAppWrapper');
          unlistenParentHistory();
          unmount();
          appUnMounted();
        };
      },
    });

    urlForwarding.forwardApp('visualize', 'visualize');

    if (home) {
      home.featureCatalogue.register({
        id: 'visualize',
        title: 'Visualize Library',
        description: i18n.translate('visualizations.visualizeDescription', {
          defaultMessage:
            'Create visualizations and aggregate data stores in your Elasticsearch indices.',
        }),
        icon: 'visualizeApp',
        path: `/app/visualize#${VisualizeConstants.LANDING_PAGE_PATH}`,
        showOnHomePage: false,
        category: 'data',
      });
    }

    if (share) {
      share.url.locators.create(new VisualizeLocatorDefinition());
    }

    setUISettings(core.uiSettings);
    setAnalytics(core.analytics);
    setTheme(core.theme);

    expressions.registerFunction(rangeExpressionFunction);
    expressions.registerFunction(visDimensionExpressionFunction);
    expressions.registerFunction(xyDimensionExpressionFunction);
    uiActions.registerTrigger(aggBasedVisualizationTrigger);
    uiActions.registerTrigger(visualizeEditorTrigger);
    uiActions.registerTrigger(dashboardVisualizationPanelTrigger);
    embeddable.registerReactEmbeddableFactory(VISUALIZE_EMBEDDABLE_TYPE, async () => {
      const {
        plugins: { embeddable: embeddableStart, embeddableEnhanced: embeddableEnhancedStart },
      } = start();

      const { getVisualizeEmbeddableFactory } = await import('./embeddable/visualize_embeddable');
      return getVisualizeEmbeddableFactory({ embeddableStart, embeddableEnhancedStart });
    });
    embeddable.registerAddFromLibraryType<VisualizationSavedObjectAttributes>({
      onAdd: async (container, savedObject) => {
        const { deserializeState } = await import('./embeddable/state');
        const initialState = await deserializeState({
          rawState: { savedObjectId: savedObject.id },
          references: savedObject.references,
        });
        container.addNewPanel<VisualizeSerializedState>({
          panelType: VISUALIZE_EMBEDDABLE_TYPE,
          initialState,
        });
      },
      savedObjectType: VISUALIZE_EMBEDDABLE_TYPE,
      savedObjectName: i18n.translate('visualizations.visualizeSavedObjectName', {
        defaultMessage: 'Visualization',
      }),
      getIconForSavedObject: (savedObject) => {
        const visState = JSON.parse(savedObject.attributes.visState ?? '{}');
        return getTypes().get(visState.type)?.icon ?? '';
      },
    });

    contentManagement.registry.register({
      id: CONTENT_ID,
      version: {
        latest: LATEST_VERSION,
      },
      name: 'Visualize Library',
    });

    return {
      ...this.types.setup(),
      visEditorsRegistry,
      listingViewRegistry,
    };
  }

  public start(
    core: CoreStart,
    {
      data,
      expressions,
      uiActions,
      embeddable,
      spaces,
      savedObjectsTaggingOss,
      fieldFormats,
      usageCollection,
      savedObjectsManagement,
      contentManagement,
      savedSearch,
      dataViews,
      inspector,
    }: VisualizationsStartDeps
  ): VisualizationsStart {
    const types = this.types.start();
    setTypes(types);
    setI18n(core.i18n);
    setUserProfile(core.userProfile);
    setEmbeddable(embeddable);
    setApplication(core.application);
    setCapabilities(core.application.capabilities);
    setHttp(core.http);
    setSavedObjects(core.savedObjects);
    setDocLinks(core.docLinks);
    setSearch(data.search);
    setExpressions(expressions);
    setUiActions(uiActions);
    setTimeFilter(data.query.timefilter.timefilter);
    setAggs(data.search.aggs);
    setOverlays(core.overlays);
    setExecutionContext(core.executionContext);
    setChrome(core.chrome);
    setFieldFormats(fieldFormats);
    setUsageCollection(usageCollection);
    setSavedObjectsManagement(savedObjectsManagement);
    setContentManagement(contentManagement);
    setSavedSearch(savedSearch);
    setDataViews(dataViews);
    setInspector(inspector);
    setNotifications(core.notifications);

    if (spaces) {
      setSpaces(spaces);
    }

    if (savedObjectsTaggingOss) {
      setSavedObjectTagging(savedObjectsTaggingOss);
    }

    registerActions(uiActions, data, types);

    return {
      ...types,
      showNewVisModal,
    };
  }

  public stop() {
    this.types.stop();
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
