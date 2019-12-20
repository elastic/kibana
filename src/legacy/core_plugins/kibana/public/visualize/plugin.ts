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
  CoreSetup,
  CoreStart,
  LegacyCoreStart,
  Plugin,
  SavedObjectsClientContract,
} from 'kibana/public';

import { Storage } from '../../../../../plugins/kibana_utils/public';
import { DataPublicPluginStart } from '../../../../../plugins/data/public';
import { IEmbeddableStart } from '../../../../../plugins/embeddable/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../plugins/navigation/public';
import { SharePluginStart } from '../../../../../plugins/share/public';
import { KibanaLegacySetup } from '../../../../../plugins/kibana_legacy/public';
import { VisualizationsStart } from '../../../visualizations/public';
import { VisualizeEmbeddableFactory } from './embeddable/visualize_embeddable_factory';
import { VISUALIZE_EMBEDDABLE_TYPE } from './embeddable/constants';
import { VisualizeConstants } from './visualize_constants';
import { setServices, VisualizeKibanaServices } from './kibana_services';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../../plugins/home/public';
import { defaultEditor, VisEditorTypesRegistryProvider } from './legacy_imports';
import { createSavedVisLoader } from './saved_visualizations/saved_visualizations';

export interface LegacyAngularInjectedDependencies {
  legacyChrome: any;
  editorTypes: any;
}

export interface VisualizePluginStartDependencies {
  data: DataPublicPluginStart;
  embeddables: IEmbeddableStart;
  navigation: NavigationStart;
  share: SharePluginStart;
  visualizations: VisualizationsStart;
}

export interface VisualizePluginSetupDependencies {
  __LEGACY: {
    getAngularDependencies: () => Promise<LegacyAngularInjectedDependencies>;
  };
  home: HomePublicPluginSetup;
  kibana_legacy: KibanaLegacySetup;
}

export class VisualizePlugin implements Plugin {
  private startDependencies: {
    data: DataPublicPluginStart;
    embeddables: IEmbeddableStart;
    navigation: NavigationStart;
    savedObjectsClient: SavedObjectsClientContract;
    share: SharePluginStart;
    visualizations: VisualizationsStart;
  } | null = null;

  public async setup(
    core: CoreSetup,
    { home, kibana_legacy, __LEGACY: { getAngularDependencies } }: VisualizePluginSetupDependencies
  ) {
    kibana_legacy.registerLegacyApp({
      id: 'visualize',
      title: 'Visualize',
      mount: async ({ core: contextCore }, params) => {
        if (this.startDependencies === null) {
          throw new Error('not started yet');
        }

        const {
          savedObjectsClient,
          embeddables,
          navigation,
          visualizations,
          data,
          share,
        } = this.startDependencies;

        const angularDependencies = await getAngularDependencies();
        const savedVisualizations = createSavedVisLoader({
          savedObjectsClient,
          indexPatterns: data.indexPatterns,
          chrome: contextCore.chrome,
          overlays: contextCore.overlays,
        });
        const deps: VisualizeKibanaServices = {
          ...angularDependencies,
          addBasePath: contextCore.http.basePath.prepend,
          core: contextCore as LegacyCoreStart,
          chrome: contextCore.chrome,
          data,
          embeddables,
          getBasePath: core.http.basePath.get,
          indexPatterns: data.indexPatterns,
          localStorage: new Storage(localStorage),
          navigation,
          savedObjectsClient,
          savedVisualizations,
          savedQueryService: data.query.savedQueries,
          share,
          toastNotifications: contextCore.notifications.toasts,
          uiSettings: contextCore.uiSettings,
          visualizeCapabilities: contextCore.application.capabilities.visualize,
          visualizations,
        };
        setServices(deps);

        const { renderApp } = await import('./application');
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

    VisEditorTypesRegistryProvider.register(defaultEditor);
  }

  public start(
    { savedObjects: { client: savedObjectsClient } }: CoreStart,
    { embeddables, navigation, data, share, visualizations }: VisualizePluginStartDependencies
  ) {
    this.startDependencies = {
      data,
      embeddables,
      navigation,
      savedObjectsClient,
      share,
      visualizations,
    };

    const embeddableFactory = new VisualizeEmbeddableFactory(visualizations.types);
    embeddables.registerEmbeddableFactory(VISUALIZE_EMBEDDABLE_TYPE, embeddableFactory);
  }
}
