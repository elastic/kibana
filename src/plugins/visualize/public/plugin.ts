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

import { BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { filter, map } from 'rxjs/operators';
import { createHashHistory } from 'history';
import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
} from 'kibana/public';

import {
  Storage,
  createKbnUrlTracker,
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../kibana_utils/public';
import { DataPublicPluginStart, DataPublicPluginSetup, esFilters } from '../../data/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../navigation/public';
import { SharePluginStart, SharePluginSetup } from '../../share/public';
import { KibanaLegacySetup, KibanaLegacyStart } from '../../kibana_legacy/public';
import { VisualizationsStart } from '../../visualizations/public';
import { VisualizeConstants } from './application/visualize_constants';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '../../home/public';
import { VisualizeServices } from './application/types';
import { DEFAULT_APP_CATEGORIES } from '../../../core/public';
import { SavedObjectsStart } from '../../saved_objects/public';
import { EmbeddableStart } from '../../embeddable/public';
import { DashboardStart } from '../../dashboard/public';
import { UiActionsStart, VISUALIZE_FIELD_TRIGGER } from '../../ui_actions/public';
import {
  setUISettings,
  setApplication,
  setIndexPatterns,
  setQueryService,
  setShareService,
} from './services';
import { visualizeFieldAction } from './actions/visualize_field_action';
import { createVisualizeUrlGenerator } from './url_generator';

export interface VisualizePluginStartDependencies {
  data: DataPublicPluginStart;
  navigation: NavigationStart;
  share?: SharePluginStart;
  visualizations: VisualizationsStart;
  embeddable: EmbeddableStart;
  kibanaLegacy: KibanaLegacyStart;
  savedObjects: SavedObjectsStart;
  dashboard: DashboardStart;
  uiActions: UiActionsStart;
}

export interface VisualizePluginSetupDependencies {
  home?: HomePublicPluginSetup;
  kibanaLegacy: KibanaLegacySetup;
  data: DataPublicPluginSetup;
  share?: SharePluginSetup;
}

export class VisualizePlugin
  implements
    Plugin<void, void, VisualizePluginSetupDependencies, VisualizePluginStartDependencies> {
  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;
  private currentHistory: ScopedHistory | undefined = undefined;

  constructor(private initializerContext: PluginInitializerContext) {}

  public async setup(
    core: CoreSetup<VisualizePluginStartDependencies>,
    { home, kibanaLegacy, data, share }: VisualizePluginSetupDependencies
  ) {
    const {
      appMounted,
      appUnMounted,
      stop: stopUrlTracker,
      setActiveUrl,
      restorePreviousUrl,
    } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend('/app/visualize'),
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
    });
    this.stopUrlTracking = () => {
      stopUrlTracker();
    };
    if (share) {
      share.urlGenerators.registerUrlGenerator(
        createVisualizeUrlGenerator(async () => {
          const [coreStart] = await core.getStartServices();
          return {
            appBasePath: coreStart.application.getUrlForApp('visualize'),
            useHashedUrl: coreStart.uiSettings.get('state:storeInSessionStorage'),
          };
        })
      );
    }
    setUISettings(core.uiSettings);

    core.application.register({
      id: 'visualize',
      title: 'Visualize',
      order: 8000,
      euiIconType: 'visualizeApp',
      defaultPath: '#/',
      category: DEFAULT_APP_CATEGORIES.kibana,
      updater$: this.appStateUpdater.asObservable(),
      // remove all references to visualize
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        this.currentHistory = params.history;

        // make sure the index pattern list is up to date
        pluginsStart.data.indexPatterns.clearCache();
        // make sure a default index pattern exists
        // if not, the page will be redirected to management and visualize won't be rendered
        await pluginsStart.data.indexPatterns.ensureDefaultIndexPattern();

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
          kibanaLegacy: pluginsStart.kibanaLegacy,
          pluginInitializerContext: this.initializerContext,
          chrome: coreStart.chrome,
          data: pluginsStart.data,
          localStorage: new Storage(localStorage),
          navigation: pluginsStart.navigation,
          savedVisualizations: pluginsStart.visualizations.savedVisualizationsLoader,
          share: pluginsStart.share,
          toastNotifications: coreStart.notifications.toasts,
          visualizeCapabilities: coreStart.application.capabilities.visualize,
          visualizations: pluginsStart.visualizations,
          embeddable: pluginsStart.embeddable,
          setActiveUrl,
          createVisEmbeddableFromObject:
            pluginsStart.visualizations.__LEGACY.createVisEmbeddableFromObject,
          savedObjectsPublic: pluginsStart.savedObjects,
          scopedHistory: params.history,
          restorePreviousUrl,
          dashboard: pluginsStart.dashboard,
        };

        params.element.classList.add('visAppWrapper');
        const { renderApp } = await import('./application');
        const unmount = renderApp(params, services);
        return () => {
          unlistenParentHistory();
          unmount();
          appUnMounted();
        };
      },
    });

    kibanaLegacy.forwardApp('visualize', 'visualize');

    if (home) {
      home.featureCatalogue.register({
        id: 'visualize',
        title: 'Visualize',
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
  }

  public start(core: CoreStart, plugins: VisualizePluginStartDependencies) {
    setApplication(core.application);
    setIndexPatterns(plugins.data.indexPatterns);
    setQueryService(plugins.data.query);
    if (plugins.share) {
      setShareService(plugins.share);
    }
    plugins.uiActions.addTriggerAction(VISUALIZE_FIELD_TRIGGER, visualizeFieldAction);
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
