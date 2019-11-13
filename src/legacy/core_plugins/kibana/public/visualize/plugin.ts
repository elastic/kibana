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

import { IAngularStatic } from 'angular';
import { i18n } from '@kbn/i18n';

import {
  App,
  CoreSetup,
  CoreStart,
  LegacyCoreStart,
  Plugin,
  SavedObjectsClientContract,
} from 'kibana/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';
import { DataStart } from '../../../data/public';
import { DataPublicPluginStart as NpDataStart } from '../../../../../plugins/data/public';
import { EmbeddablePublicPlugin } from '../../../../../plugins/embeddable/public';
import { NavigationStart } from '../../../navigation/public';
import { VisualizationsStart } from '../../../visualizations/public';
import { LocalApplicationService } from '../local_application_service';
import { VisualizeEmbeddableFactory } from './embeddable/visualize_embeddable_factory';
import { VISUALIZE_EMBEDDABLE_TYPE } from './embeddable/constants';
import { VisualizeConstants } from './visualize_constants';
import { setServices, VisualizeKibanaServices } from './kibana_services';
import {
  FeatureCatalogueCategory,
  FeatureCatalogueSetup,
} from '../../../../../plugins/feature_catalogue/public';
import { defaultEditor } from './legacy_imports';

export interface LegacyAngularInjectedDependencies {
  chromeLegacy: any;
  editorTypes: any;
  shareContextMenuExtensions: any;
  savedObjectRegistry: any;
  savedObjectClient: any;
  savedDashboards: any;
  savedVisualizations: any;
}

export interface VisualizePluginStartDependencies {
  dataStart: DataStart;
  npData: NpDataStart;
  embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
  navigation: NavigationStart;
  visualizations: VisualizationsStart;
}

export interface VisualizePluginSetupDependencies {
  feature_catalogue: FeatureCatalogueSetup;
  __LEGACY: {
    angular: IAngularStatic;
    getAngularDependencies: () => Promise<LegacyAngularInjectedDependencies>;
    localApplicationService: LocalApplicationService;
    VisEditorTypesRegistryProvider: any;
  };
}

export class VisualizePlugin implements Plugin {
  private startDependencies: {
    dataStart: DataStart;
    npDataStart: NpDataStart;
    embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
    navigation: NavigationStart;
    savedObjectsClient: SavedObjectsClientContract;
    visualizations: VisualizationsStart;
  } | null = null;

  public async setup(
    core: CoreSetup,
    {
      feature_catalogue,
      __LEGACY: {
        localApplicationService,
        getAngularDependencies,
        VisEditorTypesRegistryProvider,
        ...legacyServices
      },
    }: VisualizePluginSetupDependencies
  ) {
    const app: App = {
      id: '',
      title: 'Visualize',
      mount: async ({ core: contextCore }, params) => {
        if (this.startDependencies === null) {
          throw new Error('not started yet');
        }

        const {
          dataStart,
          savedObjectsClient,
          embeddables,
          navigation,
          visualizations,
          npDataStart,
        } = this.startDependencies;

        const angularDependencies = await getAngularDependencies();
        const deps: VisualizeKibanaServices = {
          ...legacyServices,
          ...angularDependencies,
          addBasePath: contextCore.http.basePath.prepend,
          core: contextCore as LegacyCoreStart,
          chrome: contextCore.chrome,
          dataStart,
          npDataStart,
          docLinks: contextCore.docLinks,
          embeddables,
          getBasePath: core.http.basePath.get,
          getInjected: core.injectedMetadata.getInjectedVar,
          indexPatterns: dataStart.indexPatterns.indexPatterns,
          localStorage: new Storage(localStorage),
          navigation,
          queryFilter: npDataStart.query.filterManager,
          savedObjectsClient,
          savedQueryService: dataStart.search.services.savedQueryService,
          toastNotifications: contextCore.notifications.toasts,
          uiSettings: contextCore.uiSettings,
          visualizeCapabilities: contextCore.application.capabilities.visualize,
          visualizations,
        };
        setServices(deps);

        const { renderApp } = await import('./application');
        return renderApp(params.element, params.appBasePath, deps);
      },
    };

    feature_catalogue.register({
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

    localApplicationService.register({ ...app, id: 'visualize' });
    VisEditorTypesRegistryProvider.register(defaultEditor);
  }

  public start(
    { savedObjects: { client: savedObjectsClient } }: CoreStart,
    { dataStart, embeddables, navigation, visualizations, npData }: VisualizePluginStartDependencies
  ) {
    this.startDependencies = {
      dataStart,
      npDataStart: npData,
      embeddables,
      navigation,
      savedObjectsClient,
      visualizations,
    };

    const embeddableFactory = new VisualizeEmbeddableFactory(visualizations.types);
    embeddables.registerEmbeddableFactory(VISUALIZE_EMBEDDABLE_TYPE, embeddableFactory);
  }
}
