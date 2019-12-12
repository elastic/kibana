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
  Capabilities,
  ChromeStart,
  CoreStart,
  DocLinksStart,
  ToastsStart,
  IUiSettingsClient,
} from 'kibana/public';
import * as docViewsRegistry from 'ui/registry/doc_views';
import chromeLegacy from 'ui/chrome';
import { IPrivate } from 'ui/private';
import { FilterManager, TimefilterContract, IndexPatternsContract } from 'src/plugins/data/public';
// @ts-ignore
import { createSavedSearchesService } from '../saved_searches/saved_searches';
// @ts-ignore
import { createSavedSearchFactory } from '../saved_searches/_saved_search';
import { DiscoverStartPlugins } from '../plugin';
import { EuiUtilsStart } from '../../../../../../plugins/eui_utils/public';
import { SavedSearch } from '../types';
import { SharePluginStart } from '../../../../../../plugins/share/public';

export interface DiscoverServices {
  addBasePath: (path: string) => string;
  capabilities: Capabilities;
  chrome: ChromeStart;
  core: CoreStart;
  docLinks: DocLinksStart;
  docViewsRegistry: docViewsRegistry.DocViewsRegistry;
  eui_utils: EuiUtilsStart;
  filterManager: FilterManager;
  indexPatterns: IndexPatternsContract;
  inspector: unknown;
  metadata: { branch: string };
  share: SharePluginStart;
  timefilter: TimefilterContract;
  toastNotifications: ToastsStart;
  // legacy
  getSavedSearchById: (id: string) => Promise<SavedSearch>;
  getSavedSearchUrlById: (id: string) => Promise<string>;
  uiSettings: IUiSettingsClient;
}

export async function buildGlobalAngularServices() {
  const injector = await chromeLegacy.dangerouslyGetActiveInjector();
  const Private = injector.get<IPrivate>('Private');
  const kbnUrl = injector.get<IPrivate>('kbnUrl');
  const SavedSearchFactory = createSavedSearchFactory(Private);
  const service = createSavedSearchesService(Private, SavedSearchFactory, kbnUrl, chromeLegacy);
  return {
    getSavedSearchById: async (id: string) => service.get(id),
    getSavedSearchUrlById: async (id: string) => service.urlFor(id),
  };
}

export async function buildServices(core: CoreStart, plugins: DiscoverStartPlugins, test: false) {
  const globalAngularServices = !test
    ? await buildGlobalAngularServices()
    : {
        getSavedSearchById: async (id: string) => void id,
        getSavedSearchUrlById: async (id: string) => void id,
        State: null,
      };

  return {
    ...globalAngularServices,
    addBasePath: core.http.basePath.prepend,
    capabilities: core.application.capabilities,
    chrome: core.chrome,
    core,
    data: plugins.data,
    docLinks: core.docLinks,
    docViewsRegistry,
    eui_utils: plugins.eui_utils,
    filterManager: plugins.data.query.filterManager,
    indexPatterns: plugins.data.indexPatterns,
    inspector: plugins.inspector,
    // @ts-ignore
    metadata: core.injectedMetadata.getLegacyMetadata(),
    share: plugins.share,
    timefilter: plugins.data.query.timefilter.timefilter,
    toastNotifications: core.notifications.toasts,
    uiSettings: core.uiSettings,
  };
}
