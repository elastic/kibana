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

import { CoreSetup, CoreStart, Plugin, SavedObjectsClientContract } from 'kibana/public';
import { RenderDeps } from './render_app';
import { LocalApplicationService } from '../local_application_service';
import { DataStart } from '../../../data/public';
import { SavedQueryService } from '../../../data/public/search/search_bar/lib/saved_query_service';
import { EmbeddablePublicPlugin } from '../../../../../plugins/embeddable/public';

export interface LegacyAngularInjectedDependencies {
  queryFilter: any;
  getUnhashableStates: any;
  shareContextMenuExtensions: any;
  getFeatureCatalogueRegistryProvider: () => Promise<any>;
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
  };
}

export class DashboardPlugin implements Plugin {
  private dataStart: DataStart | null = null;
  private savedObjectsClient: SavedObjectsClientContract | null = null;
  private savedQueryService: SavedQueryService | null = null;
  private embeddables: ReturnType<EmbeddablePublicPlugin['start']> | null = null;

  public setup(
    core: CoreSetup,
    {
      __LEGACY: { localApplicationService, getAngularDependencies, ...legacyServices },
    }: DashboardPluginSetupDependencies
  ) {
    localApplicationService.register({
      id: 'discover',
      title: 'Discover',
      mount: async ({ core: contextCore }, params) => {
        const angularDependencies = await getAngularDependencies();
        const deps: RenderDeps = {
          core: contextCore,
          ...legacyServices,
          ...angularDependencies,
          indexPatterns: this.dataStart!.indexPatterns.indexPatterns,
          savedObjectsClient: this.savedObjectsClient!,
          chrome: contextCore.chrome,
          addBasePath: contextCore.http.basePath.prepend,
          uiSettings: contextCore.uiSettings,
          savedQueryService: this.savedQueryService!,
          embeddables: this.embeddables!,
          dashboardCapabilities: contextCore.application.capabilities.dashboard,
        };
        const { renderApp } = await import('./render_app');
        return renderApp(params.element, params.appBasePath, deps);
      },
    });
  }

  start(core: CoreStart, { data, embeddables }: DashboardPluginStartDependencies) {
    // TODO is this really the right way? I though the app context would give us those
    this.dataStart = data;
    this.savedObjectsClient = core.savedObjects.client;
    this.savedQueryService = data.search.services.savedQueryService;
    this.embeddables = embeddables;
  }
}
