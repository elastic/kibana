/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { createHashHistory } from 'history';
import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
  DEFAULT_APP_CATEGORIES,
} from '../../../core/public';

import {
  Storage,
  createKbnUrlTracker,
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../kibana_utils/public';

import { VisualizeConstants } from './application/visualize_constants';
import { DataPublicPluginStart, DataPublicPluginSetup, esFilters } from '../../data/public';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '../../home/public';

import type { PresentationUtilPluginStart } from '../../../../src/plugins/presentation_util/public';
import type { NavigationPublicPluginStart as NavigationStart } from '../../navigation/public';
import type { SharePluginStart, SharePluginSetup } from '../../share/public';
import type { UrlForwardingSetup, UrlForwardingStart } from '../../url_forwarding/public';
import type { VisualizationsStart } from '../../visualizations/public';
import type { VisualizeServices } from './application/types';
import type { SavedObjectsStart } from '../../saved_objects/public';
import type { EmbeddableStart } from '../../embeddable/public';
import type { DashboardStart } from '../../dashboard/public';
import type { SavedObjectTaggingOssPluginStart } from '../../saved_objects_tagging_oss/public';
import type { UsageCollectionStart } from '../../usage_collection/public';

import { setVisEditorsRegistry, setUISettings, setUsageCollector } from './services';
import { createVisEditorsRegistry, VisEditorsRegistry } from './vis_editors_registry';
import { VisualizeLocatorDefinition } from '../common/locator';

export interface VisualizePluginStartDependencies {
  data: DataPublicPluginStart;
  navigation: NavigationStart;
  share?: SharePluginStart;
  visualizations: VisualizationsStart;
  embeddable: EmbeddableStart;
  urlForwarding: UrlForwardingStart;
  savedObjects: SavedObjectsStart;
  dashboard: DashboardStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  usageCollection?: UsageCollectionStart;
}

export interface VisualizePluginSetupDependencies {
  home?: HomePublicPluginSetup;
  urlForwarding: UrlForwardingSetup;
  data: DataPublicPluginSetup;
  share?: SharePluginSetup;
}

export interface VisualizePluginSetup {
  visEditorsRegistry: VisEditorsRegistry;
}

export class VisualizePlugin
  implements
    Plugin<
      VisualizePluginSetup,
      void,
      VisualizePluginSetupDependencies,
      VisualizePluginStartDependencies
    >
{
  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;
  private currentHistory: ScopedHistory | undefined = undefined;
  private isLinkedToOriginatingApp: (() => boolean) | undefined = undefined;

  private readonly visEditorsRegistry = createVisEditorsRegistry();

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<VisualizePluginStartDependencies>,
    { home, urlForwarding, data, share }: VisualizePluginSetupDependencies
  ) {
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
              filters: state.filters?.filter(esFilters.isFilterPinned),
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

    setUISettings(core.uiSettings);

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
        pluginsStart.data.indexPatterns.clearCache();
        // make sure a default index pattern exists
        // if not, the page will be redirected to management and visualize won't be rendered
        await pluginsStart.data.indexPatterns.ensureDefaultDataView();

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
          localStorage: new Storage(localStorage),
          navigation: pluginsStart.navigation,
          savedVisualizations: pluginsStart.visualizations.savedVisualizationsLoader,
          share: pluginsStart.share,
          toastNotifications: coreStart.notifications.toasts,
          visualizeCapabilities: coreStart.application.capabilities.visualize,
          dashboardCapabilities: coreStart.application.capabilities.dashboard,
          visualizations: pluginsStart.visualizations,
          embeddable: pluginsStart.embeddable,
          stateTransferService: pluginsStart.embeddable.getStateTransfer(),
          setActiveUrl,
          createVisEmbeddableFromObject:
            pluginsStart.visualizations.__LEGACY.createVisEmbeddableFromObject,
          savedObjectsPublic: pluginsStart.savedObjects,
          scopedHistory: params.history,
          restorePreviousUrl,
          dashboard: pluginsStart.dashboard,
          setHeaderActionMenu: params.setHeaderActionMenu,
          savedObjectsTagging: pluginsStart.savedObjectsTaggingOss?.getTaggingApi(),
          presentationUtil: pluginsStart.presentationUtil,
          usageCollection: pluginsStart.usageCollection,
          getKibanaVersion: () => this.initializerContext.env.packageInfo.version,
        };

        params.element.classList.add('visAppWrapper');
        const { renderApp } = await import('./application');
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
        description: i18n.translate('visualize.visualizeDescription', {
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

    return {
      visEditorsRegistry: this.visEditorsRegistry,
    } as VisualizePluginSetup;
  }

  public start(core: CoreStart, { usageCollection }: VisualizePluginStartDependencies) {
    setVisEditorsRegistry(this.visEditorsRegistry);

    if (usageCollection) {
      setUsageCollector(usageCollection);
    }
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
