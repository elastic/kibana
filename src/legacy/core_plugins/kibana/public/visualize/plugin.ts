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

import angular from 'angular';
import { wrapInI18nContext } from 'ui/i18n';

import {
  App,
  CoreSetup,
  CoreStart,
  LegacyCoreStart,
  Plugin,
  SavedObjectsClientContract,
} from 'kibana/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';
import { setServices } from './kibana_services';
import { LocalApplicationService } from '../local_application_service';
import { DataStart } from '../../../data/public';
import { EmbeddablePublicPlugin } from '../../../../../plugins/embeddable/public';
import { NavigationStart } from '../../../navigation/public';
import { VisualizationsStart } from '../../../visualizations/public';
import { VisualizeEmbeddableFactory } from './embeddable/visualize_embeddable_factory';

export interface LegacyAngularInjectedDependencies {
  queryFilter: any;
  getUnhashableStates: any;
  shareContextMenuExtensions: any;
  config: any;
  savedObjectRegistry: any;
  savedObjectClient: any;
  savedDashboards: any;
  savedVisualizations: any;
}

export interface VisualizePluginStartDependencies {
  data: DataStart;
  embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
  navigation: NavigationStart;
  visualizations: VisualizationsStart;
}

export interface VisualizePluginSetupDependencies {
  __LEGACY: {
    getAngularDependencies: () => Promise<LegacyAngularInjectedDependencies>;
    localApplicationService: LocalApplicationService;
    FeatureCatalogueRegistryProvider: any;
    docTitle: any;
  };
  embeddable: any;
}

export class VisualizePlugin implements Plugin {
  private startDependencies: {
    dataStart: DataStart;
    savedObjectsClient: SavedObjectsClientContract;
    embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
    navigation: NavigationStart;
    visualizations: VisualizationsStart;
  } | null = null;

  public setup(
    core: CoreSetup,
    {
      __LEGACY: { localApplicationService, getAngularDependencies, ...legacyServices },
      embeddable,
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
        } = this.startDependencies;

        const angularDependencies = await getAngularDependencies();
        const deps = {
          core: contextCore as LegacyCoreStart,
          ...legacyServices,
          ...angularDependencies,
          addBasePath: contextCore.http.basePath.prepend,
          angular,
          chrome: contextCore.chrome,
          dataStart,
          docLinks: contextCore.docLinks,
          embeddable,
          embeddables,
          getBasePath: core.http.basePath.get,
          getInjected: core.injectedMetadata.getInjectedVar,
          indexPatterns: dataStart.indexPatterns.indexPatterns,
          indexPatternService: dataStart.indexPatterns.indexPatterns,
          localStorage: new Storage(localStorage),
          navigation,
          savedObjectsClient,
          savedQueryService: dataStart.search.services.savedQueryService,
          uiCapabilities: contextCore.application.capabilities,
          uiSettings: contextCore.uiSettings,
          visualizeCapabilities: contextCore.application.capabilities.visualize,
          VisEmbeddableFactory: VisualizeEmbeddableFactory,
          visualizations,
          wrapInI18nContext,
        };
        setServices(deps);
        const { renderApp } = await import('./render_app');
        return renderApp(params.element, params.appBasePath, deps);
      },
    };
    localApplicationService.register({ ...app, id: 'visualize' });
  }

  start(
    { savedObjects: { client: savedObjectsClient } }: CoreStart,
    { data: dataStart, embeddables, navigation, visualizations }: VisualizePluginStartDependencies
  ) {
    this.startDependencies = {
      dataStart,
      savedObjectsClient,
      embeddables,
      navigation,
      visualizations,
    };
  }
}
