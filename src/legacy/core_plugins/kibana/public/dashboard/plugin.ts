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
  CoreSetup,
  CoreStart,
  LegacyCoreStart,
  Plugin,
  SavedObjectsClientContract,
} from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { RenderDeps } from './np_ready/application';
import { DataStart } from '../../../data/public';
import {
  DataPublicPluginStart as NpDataStart,
  DataPublicPluginSetup as NpDataSetup,
} from '../../../../../plugins/data/public';
import { IEmbeddableStart } from '../../../../../plugins/embeddable/public';
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
import { createSavedDashboardLoader } from './saved_dashboard/saved_dashboards';
import { createKbnUrlTracker } from '../../../../../plugins/kibana_utils/public';
import { getQueryStateContainer } from '../../../../../plugins/data/public';

export interface DashboardPluginStartDependencies {
  data: DataStart;
  npData: NpDataStart;
  embeddables: IEmbeddableStart;
  navigation: NavigationStart;
  share: SharePluginStart;
  kibanaLegacy: KibanaLegacyStart;
}

export interface DashboardPluginSetupDependencies {
  home: HomePublicPluginSetup;
  kibanaLegacy: KibanaLegacySetup;
  data: NpDataSetup;
}

export class DashboardPlugin implements Plugin {
  private startDependencies: {
    npDataStart: NpDataStart;
    savedObjectsClient: SavedObjectsClientContract;
    embeddables: IEmbeddableStart;
    navigation: NavigationStart;
    share: SharePluginStart;
    dashboardConfig: KibanaLegacyStart['dashboardConfig'];
  } | null = null;

  private appStateUpdater = new BehaviorSubject<AngularRenderedAppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;

  public setup(
    core: CoreSetup,
    { home, kibanaLegacy, data: npData }: DashboardPluginSetupDependencies
  ) {
    const { querySyncStateContainer, stop: stopQuerySyncStateContainer } = getQueryStateContainer(
      npData.query
    );
    const { appMounted, appUnMounted, stop: stopUrlTracker } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend('/app/kibana'),
      defaultSubUrl: '#/dashboards',
      storageKey: 'lastUrl:dashboard',
      navLinkUpdater$: this.appStateUpdater,
      toastNotifications: core.notifications.toasts,
      stateParams: [
        {
          kbnUrlKey: '_g',
          stateUpdate$: querySyncStateContainer.state$,
        },
      ],
    });
    this.stopUrlTracking = () => {
      stopQuerySyncStateContainer();
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
          dashboardConfig,
        } = this.startDependencies;
        const savedDashboards = createSavedDashboardLoader({
          savedObjectsClient,
          indexPatterns: npDataStart.indexPatterns,
          chrome: contextCore.chrome,
          overlays: contextCore.overlays,
        });

        const deps: RenderDeps = {
          core: contextCore as LegacyCoreStart,
          dashboardConfig,
          navigation,
          share,
          npDataStart,
          savedObjectsClient,
          savedDashboards,
          chrome: contextCore.chrome,
          addBasePath: contextCore.http.basePath.prepend,
          uiSettings: contextCore.uiSettings,
          config: kibanaLegacy.config,
          savedQueryService: npDataStart.query.savedQueries,
          embeddables,
          dashboardCapabilities: contextCore.application.capabilities.dashboard,
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
      id: 'dashboard',
      // only register the updater in once app, otherwise all updates would happen twice
      updater$: this.appStateUpdater.asObservable(),
      navLinkId: 'kibana:dashboard',
    });
    kibanaLegacy.registerLegacyApp({ ...app, id: 'dashboards' });

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
    {
      data: dataStart,
      embeddables,
      navigation,
      npData,
      share,
      kibanaLegacy: { dashboardConfig },
    }: DashboardPluginStartDependencies
  ) {
    this.startDependencies = {
      npDataStart: npData,
      savedObjectsClient,
      embeddables,
      navigation,
      share,
      dashboardConfig,
    };
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
