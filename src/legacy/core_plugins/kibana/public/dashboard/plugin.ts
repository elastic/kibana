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
import { filter, map } from 'rxjs/operators';
import {
  App,
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClientContract,
} from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { RenderDeps } from './np_ready/application';
import {
  DataPublicPluginStart,
  DataPublicPluginSetup,
  esFilters,
} from '../../../../../plugins/data/public';
import { EmbeddableStart } from '../../../../../plugins/embeddable/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../plugins/navigation/public';
import { DashboardConstants } from './np_ready/dashboard_constants';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../../plugins/home/public';
import { SharePluginStart } from '../../../../../plugins/share/public';
import {
  AngularRenderedAppUpdater,
  KibanaLegacySetup,
  KibanaLegacyStart,
} from '../../../../../plugins/kibana_legacy/public';
import { createKbnUrlTracker } from '../../../../../plugins/kibana_utils/public';
import { DashboardStart } from '../../../../../plugins/dashboard/public';

export interface DashboardPluginStartDependencies {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  navigation: NavigationStart;
  share: SharePluginStart;
  kibanaLegacy: KibanaLegacyStart;
  dashboard: DashboardStart;
}

export interface DashboardPluginSetupDependencies {
  home: HomePublicPluginSetup;
  kibanaLegacy: KibanaLegacySetup;
  data: DataPublicPluginSetup;
}

export class DashboardPlugin implements Plugin {
  private startDependencies: {
    data: DataPublicPluginStart;
    savedObjectsClient: SavedObjectsClientContract;
    embeddable: EmbeddableStart;
    navigation: NavigationStart;
    share: SharePluginStart;
    dashboardConfig: KibanaLegacyStart['dashboardConfig'];
    dashboard: DashboardStart;
  } | null = null;

  private appStateUpdater = new BehaviorSubject<AngularRenderedAppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { home, kibanaLegacy, data }: DashboardPluginSetupDependencies) {
    const { appMounted, appUnMounted, stop: stopUrlTracker } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend('/app/kibana'),
      defaultSubUrl: `#${DashboardConstants.LANDING_PAGE_PATH}`,
      shouldTrackUrlUpdate: pathname => {
        const targetAppName = pathname.split('/')[1];
        return (
          targetAppName === DashboardConstants.DASHBOARDS_ID ||
          targetAppName === DashboardConstants.DASHBOARD_ID
        );
      },
      storageKey: 'lastUrl:dashboard',
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
    });
    this.stopUrlTracking = () => {
      stopUrlTracker();
    };
    const app: App = {
      id: '',
      title: 'Dashboards',
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        if (this.startDependencies === null) {
          throw new Error('not started yet');
        }
        appMounted();
        const {
          savedObjectsClient,
          embeddable,
          navigation,
          share,
          data: dataStart,
          dashboardConfig,
          dashboard: { getSavedDashboardLoader },
        } = this.startDependencies;
        const savedDashboards = getSavedDashboardLoader();

        const deps: RenderDeps = {
          pluginInitializerContext: this.initializerContext,
          core: coreStart,
          dashboardConfig,
          navigation,
          share,
          data: dataStart,
          savedObjectsClient,
          savedDashboards,
          chrome: coreStart.chrome,
          addBasePath: coreStart.http.basePath.prepend,
          uiSettings: coreStart.uiSettings,
          config: kibanaLegacy.config,
          savedQueryService: dataStart.query.savedQueries,
          embeddable,
          dashboardCapabilities: coreStart.application.capabilities.dashboard,
          embeddableCapabilities: {
            visualizeCapabilities: coreStart.application.capabilities.visualize,
            mapsCapabilities: coreStart.application.capabilities.maps,
          },
          localStorage: new Storage(localStorage),
        };
        const { renderApp } = await import('./np_ready/application');
        const unmount = renderApp(params.element, params.appBasePath, deps);
        return () => {
          unmount();
          appUnMounted();
        };
      },
    };
    kibanaLegacy.registerLegacyApp({
      ...app,
      id: DashboardConstants.DASHBOARD_ID,
      // only register the updater in once app, otherwise all updates would happen twice
      updater$: this.appStateUpdater.asObservable(),
      navLinkId: 'kibana:dashboard',
    });
    kibanaLegacy.registerLegacyApp({ ...app, id: DashboardConstants.DASHBOARDS_ID });

    home.featureCatalogue.register({
      id: DashboardConstants.DASHBOARD_ID,
      title: i18n.translate('kbn.dashboard.featureCatalogue.dashboardTitle', {
        defaultMessage: 'Dashboard',
      }),
      description: i18n.translate('kbn.dashboard.featureCatalogue.dashboardDescription', {
        defaultMessage: 'Display and share a collection of visualizations and saved searches.',
      }),
      icon: 'dashboardApp',
      path: `/app/kibana#${DashboardConstants.LANDING_PAGE_PATH}`,
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA,
    });
  }

  start(
    { savedObjects: { client: savedObjectsClient } }: CoreStart,
    {
      embeddable,
      navigation,
      data,
      share,
      kibanaLegacy: { dashboardConfig },
      dashboard,
    }: DashboardPluginStartDependencies
  ) {
    this.startDependencies = {
      data,
      savedObjectsClient,
      embeddable,
      navigation,
      share,
      dashboardConfig,
      dashboard,
    };
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
