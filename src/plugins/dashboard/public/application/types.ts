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
  AppMountParameters,
  CoreStart,
  SavedObjectsClientContract,
  ScopedHistory,
  ChromeStart,
  IUiSettingsClient,
  PluginInitializerContext,
} from 'kibana/public';

import { SavedObjectLoader, SavedObjectsStart } from '../../../saved_objects/public';
import { DataPublicPluginStart, IndexPatternsContract } from '../../../data/public';
import { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public';
import { NavigationPublicPluginStart } from '../../../navigation/public';
import { UsageCollectionSetup } from '../../../usage_collection/public';
import { UrlForwardingStart } from '../../../url_forwarding/public';
import { EmbeddableStart } from '../../../embeddable/public';
import { SharePluginStart } from '../../../share/public';
import { Storage } from '../../../kibana_utils/public';

export type DashboardRedirect = (props: RedirectToProps) => void;
export type RedirectToProps =
  | { destination: 'dashboard'; id?: string; useReplace?: boolean }
  | { destination: 'listing'; filter?: string; useReplace?: boolean };

export interface DashboardEmbedSettings {
  forceShowTopNavMenu?: boolean;
  forceShowQueryInput?: boolean;
  forceShowDatePicker?: boolean;
  forceHideFilterBar?: boolean;
}

export interface DashboardSaveOptions {
  newTitle: string;
  newTags?: string[];
  newDescription: string;
  newCopyOnSave: boolean;
  newTimeRestore: boolean;
  onTitleDuplicate: () => void;
  isTitleDuplicateConfirmed: boolean;
}

export interface DashboardCapabilities {
  visualizeCapabilities: { save: boolean };
  mapsCapabilities: { save: boolean };
  hideWriteControls: boolean;
  showWriteControls: boolean;
  createShortUrl: boolean;
  saveQuery: boolean;
  createNew: boolean;
  show: boolean;
}

export interface DashboardAppServices {
  core: CoreStart;
  chrome: ChromeStart;
  localStorage: Storage;
  share?: SharePluginStart;
  embeddable: EmbeddableStart;
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  restorePreviousUrl: () => void;
  savedObjects: SavedObjectsStart;
  savedDashboards: SavedObjectLoader;
  scopedHistory: () => ScopedHistory;
  indexPatterns: IndexPatternsContract;
  addBasePath: (path: string) => string;
  usageCollection?: UsageCollectionSetup;
  navigation: NavigationPublicPluginStart;
  dashboardCapabilities: DashboardCapabilities;
  initializerContext: PluginInitializerContext;
  onAppLeave: AppMountParameters['onAppLeave'];
  savedObjectsTagging?: SavedObjectsTaggingApi;
  savedObjectsClient: SavedObjectsClientContract;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  navigateToDefaultApp: UrlForwardingStart['navigateToDefaultApp'];
  savedQueryService: DataPublicPluginStart['query']['savedQueries'];
  navigateToLegacyKibanaUrl: UrlForwardingStart['navigateToLegacyKibanaUrl'];
}
