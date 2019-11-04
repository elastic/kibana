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

// @ts-ignore
import { VisEditorTypesRegistryProvider } from 'ui/registry/vis_editor_types';
// @ts-ignore
import { defaultEditor } from 'ui/vis/editors/default/default';
import {
  App,
  CoreSetup,
  CoreStart,
  LegacyCoreStart,
  Plugin,
  SavedObjectsClientContract,
} from 'kibana/public';
import { VisualizationsSetup } from '../../../visualizations/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';
import { DataStart } from '../../../data/public';
import { EmbeddablePublicPlugin } from '../../../../../plugins/embeddable/public';
import { NavigationStart } from '../../../navigation/public';
import { VisualizationsStart } from '../../../visualizations/public';
import { LocalApplicationService } from '../local_application_service';
import { VisualizeEmbeddableFactory } from './embeddable/visualize_embeddable_factory';
import { VISUALIZE_EMBEDDABLE_TYPE } from './embeddable/constants';
import { setServices, VisualizeKibanaServices, DocTitle } from './kibana_services';

export interface LegacyAngularInjectedDependencies {
  editorTypes: any;
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
  dataStart: DataStart;
  embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
  navigation: NavigationStart;
  visualizations: VisualizationsStart;
}

export interface VisualizePluginSetupDependencies {
  embeddableSetup: ReturnType<EmbeddablePublicPlugin['setup']>;
  visualizationsSetup: VisualizationsSetup;
  __LEGACY: {
    getAngularDependencies: () => Promise<LegacyAngularInjectedDependencies>;
    localApplicationService: LocalApplicationService;
    FeatureCatalogueRegistryProvider: any;
    docTitle: DocTitle;
  };
}

export class VisualizePlugin implements Plugin {
  private startDependencies: {
    dataStart: DataStart;
    embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
    navigation: NavigationStart;
    savedObjectsClient: SavedObjectsClientContract;
    visualizations: VisualizationsStart;
  } | null = null;

  public async setup(
    core: CoreSetup,
    {
      embeddableSetup,
      visualizationsSetup,
      __LEGACY: { localApplicationService, getAngularDependencies, ...legacyServices },
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
        const deps: VisualizeKibanaServices = {
          ...legacyServices,
          ...angularDependencies,
          addBasePath: contextCore.http.basePath.prepend,
          angular,
          core: contextCore as LegacyCoreStart,
          chrome: contextCore.chrome,
          dataStart,
          docLinks: contextCore.docLinks,
          embeddables,
          getBasePath: core.http.basePath.get,
          getInjected: core.injectedMetadata.getInjectedVar,
          indexPatterns: dataStart.indexPatterns.indexPatterns,
          localStorage: new Storage(localStorage),
          navigation,
          savedObjectsClient,
          savedQueryService: dataStart.search.services.savedQueryService,
          toastNotifications: contextCore.notifications.toasts,
          uiSettings: contextCore.uiSettings,
          visualizeCapabilities: contextCore.application.capabilities.visualize,
          visualizations,
          wrapInI18nContext,
        };
        setServices(deps);
        const { renderApp } = await import('./render_app');
        return renderApp(params.element, params.appBasePath, deps);
      },
    };
    localApplicationService.register({ ...app, id: 'visualize' });
    VisEditorTypesRegistryProvider.register(defaultEditor);

    const embeddableFactory = new VisualizeEmbeddableFactory(visualizationsSetup.types);
    embeddableSetup.registerEmbeddableFactory(VISUALIZE_EMBEDDABLE_TYPE, embeddableFactory);
  }

  start(
    { savedObjects: { client: savedObjectsClient } }: CoreStart,
    { dataStart, embeddables, navigation, visualizations }: VisualizePluginStartDependencies
  ) {
    this.startDependencies = {
      dataStart,
      embeddables,
      navigation,
      savedObjectsClient,
      visualizations,
    };
  }
}
