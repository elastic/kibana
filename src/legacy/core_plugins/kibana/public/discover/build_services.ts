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
import { createHashHistory, History } from 'history';

import {
  Capabilities,
  ChromeStart,
  CoreStart,
  DocLinksStart,
  ToastsStart,
  IUiSettingsClient,
} from 'kibana/public';
import {
  FilterManager,
  TimefilterContract,
  IndexPatternsContract,
  DataPublicPluginStart,
} from 'src/plugins/data/public';

import { DiscoverStartPlugins } from './plugin';
import { SharePluginStart } from '../../../../../plugins/share/public';
import { ChartsPluginStart } from '../../../../../plugins/charts/public';
import { VisualizationsStart } from '../../../../../plugins/visualizations/public';
import {
  createSavedSearchesLoader,
  DocViewerComponent,
  SavedSearch,
} from '../../../../../plugins/discover/public';

export interface DiscoverServices {
  addBasePath: (path: string) => string;
  capabilities: Capabilities;
  chrome: ChromeStart;
  core: CoreStart;
  data: DataPublicPluginStart;
  docLinks: DocLinksStart;
  DocViewer: DocViewerComponent;
  history: History;
  theme: ChartsPluginStart['theme'];
  filterManager: FilterManager;
  indexPatterns: IndexPatternsContract;
  inspector: unknown;
  metadata: { branch: string };
  share: SharePluginStart;
  timefilter: TimefilterContract;
  toastNotifications: ToastsStart;
  getSavedSearchById: (id: string) => Promise<SavedSearch>;
  getSavedSearchUrlById: (id: string) => Promise<string>;
  uiSettings: IUiSettingsClient;
  visualizations: VisualizationsStart;
}
export async function buildServices(
  core: CoreStart,
  plugins: DiscoverStartPlugins
): Promise<DiscoverServices> {
  const services = {
    savedObjectsClient: core.savedObjects.client,
    indexPatterns: plugins.data.indexPatterns,
    search: plugins.data.search,
    chrome: core.chrome,
    overlays: core.overlays,
  };
  const savedObjectService = createSavedSearchesLoader(services);
  return {
    addBasePath: core.http.basePath.prepend,
    capabilities: core.application.capabilities,
    chrome: core.chrome,
    core,
    data: plugins.data,
    docLinks: core.docLinks,
    DocViewer: plugins.discover.docViews.DocViewer,
    history: createHashHistory(),
    theme: plugins.charts.theme,
    filterManager: plugins.data.query.filterManager,
    getSavedSearchById: async (id: string) => savedObjectService.get(id),
    getSavedSearchUrlById: async (id: string) => savedObjectService.urlFor(id),
    indexPatterns: plugins.data.indexPatterns,
    inspector: plugins.inspector,
    // @ts-ignore
    metadata: core.injectedMetadata.getLegacyMetadata(),
    share: plugins.share,
    timefilter: plugins.data.query.timefilter.timefilter,
    toastNotifications: core.notifications.toasts,
    uiSettings: core.uiSettings,
    visualizations: plugins.visualizations,
  };
}
