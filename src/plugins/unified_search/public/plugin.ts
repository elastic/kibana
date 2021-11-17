/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createHashHistory } from 'history';
import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  PluginInitializerContext,
  ScopedHistory,
  DEFAULT_APP_CATEGORIES,
} from '../../../core/public';
import type { NavigationPublicPluginStart as NavigationStart } from '../../navigation/public';
import type { VisualizationsStart, VisualizationsSetup } from '../../visualizations/public';
import type { SavedObjectsStart } from '../../saved_objects/public';
import type { EmbeddableStart } from '../../embeddable/public';
import type { DashboardStart } from '../../dashboard/public';
import type { SavedObjectTaggingOssPluginStart } from '../../saved_objects_tagging_oss/public';
import type { UsageCollectionStart } from '../../usage_collection/public';
import type { ChartsPluginSetup } from '../../charts/public';
import type { UsageCollectionSetup } from '../../usage_collection/public';
import { HomePublicPluginSetup } from '../../home/public';
import type { UrlForwardingSetup, UrlForwardingStart } from '../../url_forwarding/public';
import { DataPublicPluginStart, DataPublicPluginSetup, esFilters } from '../../data/public';
import {
  Storage,
  createKbnUrlTracker,
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../kibana_utils/public';
import { BASE_PATH, APP_ID } from '../common';

/** @internal */
export interface UnifiedSearchSetupDependencies {
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  usageCollection: UsageCollectionSetup;
  home?: HomePublicPluginSetup;
  urlForwarding: UrlForwardingSetup;
  data: DataPublicPluginSetup;
}

/** @internal */
export interface UnifiedSearchPluginStartDependencies {
  data: DataPublicPluginStart;
  navigation: NavigationStart;
  visualizations: VisualizationsStart;
  embeddable: EmbeddableStart;
  urlForwarding: UrlForwardingStart;
  savedObjects: SavedObjectsStart;
  dashboard: DashboardStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  usageCollection?: UsageCollectionStart;
}

export class UnifiedSearchPlugin {
  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;
  private currentHistory: ScopedHistory | undefined = undefined;
  private isLinkedToOriginatingApp: (() => boolean) | undefined = undefined;

  constructor(private initializerContext: PluginInitializerContext) {}

  setup(
    core: CoreSetup<UnifiedSearchPluginStartDependencies>,
    { urlForwarding, data }: UnifiedSearchSetupDependencies
  ) {
    const {
      appMounted,
      appUnMounted,
      stop: stopUrlTracker,
      setActiveUrl,
      restorePreviousUrl,
    } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend(BASE_PATH),
      defaultSubUrl: '#/',
      storageKey: `lastUrl:${core.http.basePath.get()}:unified_search`,
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
          return core.http.basePath.prepend(BASE_PATH);
        }
        return urlToSave;
      },
    });

    this.stopUrlTracking = () => {
      stopUrlTracker();
    };

    core.application.register({
      id: APP_ID,
      title: 'Unified search',
      order: 10000,
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
            pluginsStart.embeddable.getStateTransfer().getIncomingEditorState(APP_ID)
              ?.originatingApp
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
        const services = {
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
          toastNotifications: coreStart.notifications.toasts,
          visualizeCapabilities: coreStart.application.capabilities.visualize,
          dashboardCapabilities: coreStart.application.capabilities.dashboard,
          visualizations: pluginsStart.visualizations,
          embeddable: pluginsStart.embeddable,
          stateTransferService: pluginsStart.embeddable.getStateTransfer(),
          setActiveUrl,
          savedObjectsPublic: pluginsStart.savedObjects,
          scopedHistory: params.history,
          restorePreviousUrl,
          dashboard: pluginsStart.dashboard,
          setHeaderActionMenu: params.setHeaderActionMenu,
          savedObjectsTagging: pluginsStart.savedObjectsTaggingOss?.getTaggingApi(),
          usageCollection: pluginsStart.usageCollection,
          getKibanaVersion: () => this.initializerContext.env.packageInfo.version,
        };

        params.element.classList.add('unifiedSearchAppWrapper');
        const { renderApp } = await import('./application');
        const unmount = renderApp(params, services);
        return () => {
          data.search.session.clear();
          params.element.classList.remove('unifiedSearchAppWrapper');
          unlistenParentHistory();
          unmount();
          appUnMounted();
        };
      },
    });

    urlForwarding.forwardApp(APP_ID, APP_ID);

    return {};
  }

  start() {}

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
