/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { filter, map } from 'rxjs/operators';
import { createHashHistory } from 'history';
import { BehaviorSubject } from 'rxjs';
import {
  AppMountParameters,
  AppUpdater,
  DEFAULT_APP_CATEGORIES,
  ScopedHistory,
} from '../../../core/public';
import { VisualizeConstants } from '../common/constants';
import {
  setUISettings,
  setTypes,
  setApplication,
  setCapabilities,
  setHttp,
  setSearch,
  setSavedObjects,
  setUsageCollector,
  setExpressions,
  setUiActions,
  setTimeFilter,
  setAggs,
  setChrome,
  setOverlays,
  setEmbeddable,
  setDocLinks,
  setSpaces,
  setTheme,
  setExecutionContext,
} from './services';
import {
  createVisEmbeddableFromObject,
  VISUALIZE_EMBEDDABLE_TYPE,
  VisualizeEmbeddableFactory,
} from './embeddable';
import { TypesService } from './vis_types/types_service';
import { range as rangeExpressionFunction } from '../common/expression_functions/range';
import { visDimension as visDimensionExpressionFunction } from '../common/expression_functions/vis_dimension';
import { xyDimension as xyDimensionExpressionFunction } from '../common/expression_functions/xy_dimension';

import {
  createKbnUrlStateStorage,
  createKbnUrlTracker,
  createStartServicesGetter,
  Storage,
  withNotifyOnErrors,
} from '../../kibana_utils/public';
import { VisualizeLocatorDefinition } from '../common/locator';
import { showNewVisModal } from './wizard';
import { createVisEditorsRegistry, VisEditorsRegistry } from './vis_editors_registry';
import { FeatureCatalogueCategory } from '../../home/public';
import { visualizeEditorTrigger } from './triggers';

import type { VisualizeServices } from './visualize_app/types';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  ApplicationStart,
  SavedObjectsClientContract,
} from '../../../core/public';
import type { UsageCollectionSetup } from '../../usage_collection/public';
import type { UiActionsStart, UiActionsSetup } from '../../ui_actions/public';
import type { SavedObjectsStart } from '../../saved_objects/public';
import type { TypesSetup, TypesStart } from './vis_types';
import type {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '../../../plugins/inspector/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '../../../plugins/data/public';
import type { DataViewsPublicPluginStart } from '../../../plugins/data_views/public';
import type { ExpressionsSetup, ExpressionsStart } from '../../expressions/public';
import type { EmbeddableSetup, EmbeddableStart } from '../../embeddable/public';
import type { SavedObjectTaggingOssPluginStart } from '../../saved_objects_tagging_oss/public';
import type { NavigationPublicPluginStart as NavigationStart } from '../../navigation/public';
import type { SharePluginSetup, SharePluginStart } from '../../share/public';
import type { UrlForwardingSetup, UrlForwardingStart } from '../../url_forwarding/public';
import type { PresentationUtilPluginStart } from '../../presentation_util/public';
import type { UsageCollectionStart } from '../../usage_collection/public';
import type { ScreenshotModePluginStart } from '../../screenshot_mode/public';
import type { HomePublicPluginSetup } from '../../home/public';
import type { SpacesPluginStart } from '../../../../x-pack/plugins/spaces/public';

/**
 * Interface for this plugin's returned setup/start contracts.
 *
 * @public
 */

export type VisualizationsSetup = TypesSetup & { visEditorsRegistry: VisEditorsRegistry };

export interface VisualizationsStart extends TypesStart {
  showNewVisModal: typeof showNewVisModal;
}

export interface VisualizationsSetupDeps {
  data: DataPublicPluginSetup;
  embeddable: EmbeddableSetup;
  expressions: ExpressionsSetup;
  inspector: InspectorSetup;
  uiActions: UiActionsSetup;
  usageCollection: UsageCollectionSetup;
  urlForwarding: UrlForwardingSetup;
  home?: HomePublicPluginSetup;
  share?: SharePluginSetup;
}

export interface VisualizationsStartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  uiActions: UiActionsStart;
  application: ApplicationStart;
  getAttributeService: EmbeddableStart['getAttributeService'];
  navigation: NavigationStart;
  presentationUtil: PresentationUtilPluginStart;
  savedObjects: SavedObjectsStart;
  savedObjectsClient: SavedObjectsClientContract;
  spaces?: SpacesPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  share?: SharePluginStart;
  urlForwarding: UrlForwardingStart;
  usageCollection?: UsageCollectionStart;
  screenshotMode: ScreenshotModePluginStart;
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
      usageCollection,
      data,
      home,
      urlForwarding,
      share,
      uiActions,
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
        return urlToSave;
      },
    });
    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    const start = createStartServicesGetter(core.getStartServices);
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
        // make sure a default index pattern exists
        // if not, the page will be redirected to management and visualize won't be rendered
        await pluginsStart.dataViews.ensureDefaultDataView();

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
          dataViews: pluginsStart.dataViews,
          localStorage: new Storage(localStorage),
          navigation: pluginsStart.navigation,
          share: pluginsStart.share,
          toastNotifications: coreStart.notifications.toasts,
          visualizeCapabilities: coreStart.application.capabilities.visualize,
          dashboardCapabilities: coreStart.application.capabilities.dashboard,
          embeddable: pluginsStart.embeddable,
          stateTransferService: pluginsStart.embeddable.getStateTransfer(),
          setActiveUrl,
          createVisEmbeddableFromObject: createVisEmbeddableFromObject({ start }),
          scopedHistory: params.history,
          restorePreviousUrl,
          setHeaderActionMenu: params.setHeaderActionMenu,
          savedObjectsTagging: pluginsStart.savedObjectsTaggingOss?.getTaggingApi(),
          presentationUtil: pluginsStart.presentationUtil,
          usageCollection: pluginsStart.usageCollection,
          getKibanaVersion: () => this.initializerContext.env.packageInfo.version,
          spaces: pluginsStart.spaces,
          visEditorsRegistry,
        };

        params.element.classList.add('visAppWrapper');
        const { renderApp } = await import('./visualize_app');
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
        category: FeatureCatalogueCategory.DATA,
      });
    }

    if (share) {
      share.url.locators.create(new VisualizeLocatorDefinition());
    }

    setUISettings(core.uiSettings);
    setUsageCollector(usageCollection);
    setTheme(core.theme);

    expressions.registerFunction(rangeExpressionFunction);
    expressions.registerFunction(visDimensionExpressionFunction);
    expressions.registerFunction(xyDimensionExpressionFunction);
    uiActions.registerTrigger(visualizeEditorTrigger);
    const embeddableFactory = new VisualizeEmbeddableFactory({ start });
    embeddable.registerEmbeddableFactory(VISUALIZE_EMBEDDABLE_TYPE, embeddableFactory);

    return {
      ...this.types.setup(),
      visEditorsRegistry,
    };
  }

  public start(
    core: CoreStart,
    {
      data,
      expressions,
      uiActions,
      embeddable,
      savedObjects,
      spaces,
      savedObjectsTaggingOss,
      usageCollection,
    }: VisualizationsStartDeps
  ): VisualizationsStart {
    const types = this.types.start();
    setTypes(types);
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

    if (spaces) {
      setSpaces(spaces);
    }

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
