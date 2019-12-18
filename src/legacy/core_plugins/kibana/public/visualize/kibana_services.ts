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
  ChromeStart,
  LegacyCoreStart,
  SavedObjectsClientContract,
  ToastsStart,
  IUiSettingsClient,
} from 'kibana/public';

import { NavigationPublicPluginStart as NavigationStart } from '../../../../../plugins/navigation/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';
import { IEmbeddableStart } from '../../../../../plugins/embeddable/public';
import { SharePluginStart } from '../../../../../plugins/share/public';
import { DataPublicPluginStart, IndexPatternsContract } from '../../../../../plugins/data/public';
import { VisualizationsStart } from '../../../visualizations/public';
import { SavedVisualizations } from './types';

export interface VisualizeKibanaServices {
  addBasePath: (url: string) => string;
  chrome: ChromeStart;
  core: LegacyCoreStart;
  data: DataPublicPluginStart;
  editorTypes: any;
  embeddables: IEmbeddableStart;
  getBasePath: () => string;
  indexPatterns: IndexPatternsContract;
  legacyChrome: any;
  localStorage: Storage;
  navigation: NavigationStart;
  toastNotifications: ToastsStart;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectRegistry: any;
  savedQueryService: DataPublicPluginStart['query']['savedQueries'];
  savedVisualizations: SavedVisualizations;
  share: SharePluginStart;
  uiSettings: IUiSettingsClient;
  visualizeCapabilities: any;
  visualizations: VisualizationsStart;
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
