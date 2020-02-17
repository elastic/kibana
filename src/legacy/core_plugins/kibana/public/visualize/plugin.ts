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

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClientContract,
} from 'kibana/public';

import { Storage, createKbnUrlTracker } from '../../../../../plugins/kibana_utils/public';
import {
  DataPublicPluginStart,
  DataPublicPluginSetup,
  getQueryStateContainer,
} from '../../../../../plugins/data/public';
import { IEmbeddableStart } from '../../../../../plugins/embeddable/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../plugins/navigation/public';
import { SharePluginStart } from '../../../../../plugins/share/public';
import {
  KibanaLegacySetup,
  AngularRenderedAppUpdater,
} from '../../../../../plugins/kibana_legacy/public';
import { VisualizationsStart } from '../../../visualizations/public';
import { VisualizeConstants } from './np_ready/visualize_constants';
import { setServices, VisualizeKibanaServices } from './kibana_services';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../../plugins/home/public';
import { UsageCollectionSetup } from '../../../../../plugins/usage_collection/public';

export interface VisualizePluginStartDependencies {
  data: DataPublicPluginStart;
  embeddable: IEmbeddableStart;
  navigation: NavigationStart;
  share: SharePluginStart;
  visualizations: VisualizationsStart;
}

export interface VisualizePluginSetupDependencies {
  home: HomePublicPluginSetup;
  kibanaLegacy: KibanaLegacySetup;
  usageCollection?: UsageCollectionSetup;
  data: DataPublicPluginSetup;
}

export class VisualizePlugin implements Plugin {
  private startDependencies: {
    data: DataPublicPluginStart;
    embeddable: IEmbeddableStart;
    navigation: NavigationStart;
    savedObjectsClient: SavedObjectsClientContract;
    share: SharePluginStart;
    visualizations: VisualizationsStart;
  } | null = null;
  private appStateUpdater = new BehaviorSubject<AngularRenderedAppUpdater>(() => ({}));
  private stopUrlTracking: (() => void) | undefined = undefined;

  constructor(private initializerContext: PluginInitializerContext) {}

  public async setup(
    core: CoreSetup,
    { home, kibanaLegacy, usageCollection, data }: VisualizePluginSetupDependencies
  ) {
    const { querySyncStateContainer, stop: stopQuerySyncStateContainer } = getQueryStateContainer(
      data.query
    );
    const { appMounted, appUnMounted, stop: stopUrlTracker, setActiveUrl } = createKbnUrlTracker({
      baseUrl: core.http.basePath.prepend('/app/kibana'),
      defaultSubUrl: '#/visualize',
      storageKey: 'lastUrl:visualize',
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

    kibanaLegacy.registerLegacyApp({
      id: 'visualize',
      title: 'Visualize',
      updater$: this.appStateUpdater.asObservable(),
      navLinkId: 'kibana:visualize',
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
          visualizations,
          data: dataStart,
          share,
        } = this.startDependencies;

        const deps: VisualizeKibanaServices = {
          pluginInitializerContext: this.initializerContext,
          addBasePath: coreStart.http.basePath.prepend,
          core: coreStart,
          chrome: coreStart.chrome,
          data: dataStart,
          embeddable,
          getBasePath: core.http.basePath.get,
          indexPatterns: dataStart.indexPatterns,
          localStorage: new Storage(localStorage),
          navigation,
          savedObjectsClient,
          savedVisualizations: visualizations.getSavedVisualizationsLoader(),
          savedQueryService: dataStart.query.savedQueries,
          share,
          toastNotifications: coreStart.notifications.toasts,
          uiSettings: coreStart.uiSettings,
          config: kibanaLegacy.config,
          visualizeCapabilities: coreStart.application.capabilities.visualize,
          visualizations,
          usageCollection,
          I18nContext: coreStart.i18n.Context,
          setActiveUrl,
        };
        setServices(deps);

        const { renderApp } = await import('./np_ready/application');
        const unmount = renderApp(params.element, params.appBasePath, deps);
        return () => {
          unmount();
          appUnMounted();
        };
      },
    });

    home.featureCatalogue.register({
      id: 'visualize',
      title: 'Visualize',
      description: i18n.translate('kbn.visualize.visualizeDescription', {
        defaultMessage:
          'Create visualizations and aggregate data stores in your Elasticsearch indices.',
      }),
      icon: 'visualizeApp',
      path: `/app/kibana#${VisualizeConstants.LANDING_PAGE_PATH}`,
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA,
    });
  }

  public start(
    core: CoreStart,
    { embeddable, navigation, data, share, visualizations }: VisualizePluginStartDependencies
  ) {
    this.startDependencies = {
      data,
      embeddable,
      navigation,
      savedObjectsClient: core.savedObjects.client,
      share,
      visualizations,
    };
  }

  stop() {
    if (this.stopUrlTracking) {
      this.stopUrlTracking();
    }
  }
}
