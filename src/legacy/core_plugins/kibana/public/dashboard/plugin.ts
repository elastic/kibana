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

import {
  CoreSetup,
  CoreStart,
  LegacyCoreStart,
  Plugin,
  SavedObjectsClientContract,
} from 'kibana/public';
import { Storage } from 'ui/storage';
import { RenderDeps } from './render_app';
import { LocalApplicationService } from '../local_application_service';
import { DataStart } from '../../../data/public';
import { EmbeddablePublicPlugin } from '../../../../../plugins/embeddable/public';

export interface LegacyAngularInjectedDependencies {
  queryFilter: any;
  getUnhashableStates: any;
  shareContextMenuExtensions: any;
  dashboardConfig: any;
  savedObjectRegistry: any;
  savedDashboards: any;
}

export interface DashboardPluginStartDependencies {
  data: DataStart;
  embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
}

export interface DashboardPluginSetupDependencies {
  __LEGACY: {
    getAngularDependencies: () => Promise<LegacyAngularInjectedDependencies>;
    localApplicationService: LocalApplicationService;
    FeatureCatalogueRegistryProvider: any;
    docTitle: any;
  };
}

export class DashboardPlugin implements Plugin {
  private startDependencies: {
    dataStart: DataStart;
    savedObjectsClient: SavedObjectsClientContract;
    embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
  } | null = null;

  public setup(
    core: CoreSetup,
    {
      __LEGACY: { localApplicationService, getAngularDependencies, ...legacyServices },
    }: DashboardPluginSetupDependencies
  ) {
    localApplicationService.forwardApp('dashboard', 'dashboards', { keepPrefix: true });
    localApplicationService.register({
      id: 'dashboards',
      title: 'Dashboards',
      mount: async ({ core: contextCore }, params) => {
        if (this.startDependencies === null) {
          throw new Error('not started yet');
        }
        const { dataStart, savedObjectsClient, embeddables } = this.startDependencies;
        const angularDependencies = await getAngularDependencies();
        const deps: RenderDeps = {
          core: contextCore as LegacyCoreStart,
          ...legacyServices,
          ...angularDependencies,
          dataStart,
          indexPatterns: dataStart.indexPatterns.indexPatterns,
          savedObjectsClient,
          chrome: contextCore.chrome,
          addBasePath: contextCore.http.basePath.prepend,
          uiSettings: contextCore.uiSettings,
          savedQueryService: dataStart.search.services.savedQueryService,
          embeddables,
          dashboardCapabilities: contextCore.application.capabilities.dashboard,
          localStorage: new Storage(localStorage),
        };
        const { renderApp } = await import('./render_app');
        return renderApp(params.element, params.appBasePath, deps);
      },
    });
  }

  start(
    { savedObjects: { client: savedObjectsClient } }: CoreStart,
    { data: dataStart, embeddables }: DashboardPluginStartDependencies
  ) {
    this.startDependencies = {
      dataStart,
      savedObjectsClient,
      embeddables,
    };
  }
}
