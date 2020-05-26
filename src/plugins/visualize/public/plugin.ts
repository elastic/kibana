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

import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
} from 'kibana/public';

import { Storage, createKbnUrlTracker } from '../../kibana_utils/public';
import { DataPublicPluginStart, DataPublicPluginSetup, esFilters } from '../../data/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../navigation/public';
import { SharePluginStart } from '../../share/public';
import { KibanaLegacySetup, KibanaLegacyStart } from '../../kibana_legacy/public';
import { VisualizationsStart } from '../../visualizations/public';
import { VisualizeConstants } from './application/visualize_constants';
import { setServices, VisualizeKibanaServices } from './kibana_services';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '../../home/public';
import { DashboardStart } from '../../dashboard/public';
import { DEFAULT_APP_CATEGORIES } from '../../../core/public';
import { SavedObjectsStart } from '../../saved_objects/public';

export interface VisualizePluginStartDependencies {
  data: DataPublicPluginStart;
  navigation: NavigationStart;
  share?: SharePluginStart;
  visualizations: VisualizationsStart;
  dashboard: DashboardStart;
  kibanaLegacy: KibanaLegacyStart;
  savedObjects: SavedObjectsStart;
}

export interface VisualizePluginSetupDependencies {
  home?: HomePublicPluginSetup;
  kibanaLegacy: KibanaLegacySetup;
  data: DataPublicPluginSetup;
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
    { home, kibanaLegacy, data }: VisualizePluginSetupDependencies
  ) {
    const { appMounted, appUnMounted, stop: stopUrlTracker, setActiveUrl } = createKbnUrlTracker({
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

    core.application.register({
      id: 'visualize',
      title: 'Visualize',
      order: -1002,
      euiIconType: 'visualizeApp',
      defaultPath: '#/',
      category: DEFAULT_APP_CATEGORIES.kibana,
      updater$: this.appStateUpdater.asObservable(),
      // remove all references to visualize
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        this.currentHistory = params.history;

        appMounted();

        const deps: VisualizeKibanaServices = {
          pluginInitializerContext: this.initializerContext,
          addBasePath: coreStart.http.basePath.prepend,
          core: coreStart,
          kibanaLegacy: pluginsStart.kibanaLegacy,
          chrome: coreStart.chrome,
          data: pluginsStart.data,
          localStorage: new Storage(localStorage),
          navigation: pluginsStart.navigation,
          savedObjectsClient: coreStart.savedObjects.client,
          savedVisualizations: pluginsStart.visualizations.savedVisualizationsLoader,
          share: pluginsStart.share,
          toastNotifications: coreStart.notifications.toasts,
          visualizeCapabilities: coreStart.application.capabilities.visualize,
          visualizations: pluginsStart.visualizations,
          I18nContext: coreStart.i18n.Context,
          setActiveUrl,
          createVisEmbeddableFromObject:
            pluginsStart.visualizations.__LEGACY.createVisEmbeddableFromObject,
          dashboard: pluginsStart.dashboard,
          scopedHistory: () => this.currentHistory!,
          savedObjects: pluginsStart.savedObjects,
        };
        setServices(deps);

        // make sure the index pattern list is up to date
        await pluginsStart.data.indexPatterns.clearCache();
        const { renderApp } = await import('./application/application');
        params.element.classList.add('visAppWrapper');
        const unmount = renderApp(params.element, params.appBasePath, deps);
        return () => {
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
        showOnHomePage: true,
        category: FeatureCatalogueCategory.DATA,
      });
    }
  }

  public start(core: CoreStart, plugins: VisualizePluginStartDependencies) {}

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
