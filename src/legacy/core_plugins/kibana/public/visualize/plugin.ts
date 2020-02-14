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

import { i18n } from '@kbn/i18n';

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClientContract,
} from 'kibana/public';

import { Storage } from '../../../../../plugins/kibana_utils/public';
import { DataPublicPluginStart } from '../../../../../plugins/data/public';
import { IEmbeddableStart } from '../../../../../plugins/embeddable/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../plugins/navigation/public';
import { SharePluginStart } from '../../../../../plugins/share/public';
import { KibanaLegacySetup } from '../../../../../plugins/kibana_legacy/public';
import { VisualizationsStart } from '../../../visualizations/public';
import { VisualizeConstants } from './np_ready/visualize_constants';
import { setServices, VisualizeKibanaServices } from './kibana_services';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../../plugins/home/public';
import { UsageCollectionSetup } from '../../../../../plugins/usage_collection/public';
import { Chrome } from './legacy_imports';

export interface VisualizePluginStartDependencies {
  data: DataPublicPluginStart;
  embeddable: IEmbeddableStart;
  navigation: NavigationStart;
  share: SharePluginStart;
  visualizations: VisualizationsStart;
}

export interface VisualizePluginSetupDependencies {
  __LEGACY: {
    legacyChrome: Chrome;
  };
  home: HomePublicPluginSetup;
  kibanaLegacy: KibanaLegacySetup;
  usageCollection?: UsageCollectionSetup;
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

  constructor(private initializerContext: PluginInitializerContext) {}

  public async setup(
    core: CoreSetup,
    { home, kibanaLegacy, __LEGACY, usageCollection }: VisualizePluginSetupDependencies
  ) {
    kibanaLegacy.registerLegacyApp({
      id: 'visualize',
      title: 'Visualize',
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        if (this.startDependencies === null) {
          throw new Error('not started yet');
        }

        const {
          savedObjectsClient,
          embeddable,
          navigation,
          visualizations,
          data,
          share,
        } = this.startDependencies;

        const deps: VisualizeKibanaServices = {
          ...__LEGACY,
          pluginInitializerContext: this.initializerContext,
          addBasePath: coreStart.http.basePath.prepend,
          core: coreStart,
          chrome: coreStart.chrome,
          data,
          embeddable,
          getBasePath: core.http.basePath.get,
          indexPatterns: data.indexPatterns,
          localStorage: new Storage(localStorage),
          navigation,
          savedObjectsClient,
          savedVisualizations: visualizations.getSavedVisualizationsLoader(),
          savedQueryService: data.query.savedQueries,
          share,
          toastNotifications: coreStart.notifications.toasts,
          uiSettings: coreStart.uiSettings,
          config: kibanaLegacy.config,
          visualizeCapabilities: coreStart.application.capabilities.visualize,
          visualizations,
          usageCollection,
          I18nContext: coreStart.i18n.Context,
        };
        setServices(deps);

        const { renderApp } = await import('./np_ready/application');
        return renderApp(params.element, params.appBasePath, deps);
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
}
