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
import {
  App,
  AppUpdater,
  CoreSetup,
  CoreStart,
  LegacyCoreStart,
  Plugin,
  SavedObjectsClientContract,
} from 'kibana/public';
import { createHashHistory } from 'history';
import { i18n } from '@kbn/i18n';
import { RenderDeps } from './np_ready/application';
import { DataStart } from '../../../data/public';
import {
  DataPublicPluginStart as NpDataStart,
  DataPublicPluginSetup as NpDataSetup,
} from '../../../../../plugins/data/public';
import { IEmbeddableStart } from '../../../../../plugins/embeddable/public';
import { createKbnUrlStateStorage, Storage } from '../../../../../plugins/kibana_utils/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../plugins/navigation/public';
import { DashboardConstants } from './np_ready/dashboard_constants';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../../plugins/home/public';
import { SharePluginStart } from '../../../../../plugins/share/public';
import { KibanaLegacySetup } from '../../../../../plugins/kibana_legacy/public';
import { createSavedDashboardLoader } from './saved_dashboard/saved_dashboards';
import { createKbnUrlTracker } from '../../../../../plugins/kibana_utils/public/state_management/url/kbn_url_tracker';
import { getQueryStateObservable } from '../../../../../plugins/data/public/query/state_sync/sync_query';

export interface LegacyAngularInjectedDependencies {
  dashboardConfig: any;
}

export interface DashboardPluginStartDependencies {
  data: DataStart;
  npData: NpDataStart;
  embeddables: IEmbeddableStart;
  navigation: NavigationStart;
  share: SharePluginStart;
}

export interface DashboardPluginSetupDependencies {
  __LEGACY: {
    getAngularDependencies: () => Promise<LegacyAngularInjectedDependencies>;
  };
  home: HomePublicPluginSetup;
  kibana_legacy: KibanaLegacySetup;
  npData: NpDataSetup;
}

export class DashboardPlugin implements Plugin {
  private startDependencies: {
    npDataStart: NpDataStart;
    savedObjectsClient: SavedObjectsClientContract;
    embeddables: IEmbeddableStart;
    navigation: NavigationStart;
    share: SharePluginStart;
  } | null = null;

  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;

  public setup(
    core: CoreSetup,
    {
      __LEGACY: { getAngularDependencies },
      home,
      kibana_legacy,
      npData,
    }: DashboardPluginSetupDependencies
  ) {
    const { state$, stop: stopQueryState } = getQueryStateObservable(npData.query);
    const { appMounted, appUnMounted, stop: stopUrlTracker } = createKbnUrlTracker(
      core.http.basePath.prepend('/app/kibana'),
      '#/dashboards',
      core.uiSettings.get('state.storeInSessionStorage', false),
      'lastUrl:dashboard',
      '_g',
      state$,
      this.appStateUpdater
    );
    this.stopUrlTracking = () => {
      stopQueryState();
      stopUrlTracker();
    };
    const app: App = {
      id: '',
      title: 'Dashboards',
      mount: async ({ core: contextCore }, params) => {
        if (this.startDependencies === null) {
          throw new Error('not started yet');
        }
        appMounted();
        const {
          savedObjectsClient,
          embeddables,
          navigation,
          share,
          npDataStart,
        } = this.startDependencies;
        const angularDependencies = await getAngularDependencies();
        const savedDashboards = createSavedDashboardLoader({
          savedObjectsClient,
          indexPatterns: npDataStart.indexPatterns,
          chrome: contextCore.chrome,
          overlays: contextCore.overlays,
        });

        const history = createHashHistory();
        const kbnUrlStateStorage = createKbnUrlStateStorage({
          history,
          useHash: core.uiSettings.get('state:storeInSessionStorage'),
        });

        const deps: RenderDeps = {
          core: contextCore as LegacyCoreStart,
          ...angularDependencies,
          navigation,
          share,
          npDataStart,
          savedObjectsClient,
          savedDashboards,
          chrome: contextCore.chrome,
          addBasePath: contextCore.http.basePath.prepend,
          uiSettings: contextCore.uiSettings,
          savedQueryService: npDataStart.query.savedQueries,
          embeddables,
          dashboardCapabilities: contextCore.application.capabilities.dashboard,
          localStorage: new Storage(localStorage),
          history,
          kbnUrlStateStorage,
        };
        const { renderApp } = await import('./np_ready/application');
        const unmount = renderApp(params.element, params.appBasePath, deps);
        return () => {
          unmount();
          appUnMounted();
        };
      },
    };
    kibana_legacy.registerLegacyApp({
      ...app,
      id: 'dashboard',
      // only register the updater in once app, otherwise all updates would happen twice
      updater$: this.appStateUpdater.asObservable(),
      navLinkId: 'kibana:dashboard',
    });
    kibana_legacy.registerLegacyApp({ ...app, id: 'dashboards' });

    home.featureCatalogue.register({
      id: 'dashboard',
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
    { data: dataStart, embeddables, navigation, npData, share }: DashboardPluginStartDependencies
  ) {
    this.startDependencies = {
      npDataStart: npData,
      savedObjectsClient,
      embeddables,
      navigation,
      share,
    };
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
