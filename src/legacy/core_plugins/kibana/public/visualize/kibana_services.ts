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
import {
  ChromeStart,
  DocLinksStart,
  LegacyCoreStart,
  SavedObjectsClientContract,
  ToastsStart,
  UiSettingsClientContract,
} from 'kibana/public';

import { DataStart } from '../../../data/public';

import { SavedQueryService } from '../../../data/public/search/search_bar/lib/saved_query_service';
import { NavigationStart } from '../../../navigation/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';
import { EmbeddablePublicPlugin } from '../../../../../plugins/embeddable/public';
import { DataPublicPluginStart as NpDataStart } from '../../../../../plugins/data/public';
import { SavedVisualizations } from './types';

export interface VisualizeKibanaServices {
  addBasePath: (url: string) => string;
  angular: IAngularStatic;
  chrome: ChromeStart;
  chromeLegacy: any;
  core: LegacyCoreStart;
  dataStart: DataStart;
  editorTypes: any;
  npDataStart: NpDataStart;
  docLinks: DocLinksStart;
  embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
  getBasePath: () => string;
  getInjected: (name: string, defaultValue?: any) => unknown;
  indexPatterns: any;
  localStorage: Storage;
  navigation: NavigationStart;
  queryFilter: any;
  toastNotifications: ToastsStart;
  savedObjectsClient: SavedObjectsClientContract;
  savedQueryService: SavedQueryService;
  savedVisualizations: SavedVisualizations;
  uiSettings: UiSettingsClientContract;
  visualizeCapabilities: any;
  visualizations: any;
}

let services: VisualizeKibanaServices | null = null;
export function setServices(newServices: VisualizeKibanaServices) {
  services = newServices;
}

export function getServices() {
  if (!services) {
    throw new Error(
      'Kibana services not set - are you trying to import this module from outside of the visualize app?'
    );
  }
  return services;
}

export function clearServices() {
  services = null;
}

// export types
export { VisSavedObject } from './embeddable/visualize_embeddable';
export { EmbeddableFactory, ErrorEmbeddable } from '../../../../../plugins/embeddable/public';
