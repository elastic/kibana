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
  CoreSetup,
  CoreStart,
  SavedObjectsClientContract,
  ScopedHistory,
  ChromeStart,
  IUiSettingsClient,
  PluginInitializerContext,
} from 'kibana/public';
import { History } from 'history';
import {
  DataPublicPluginStart,
  IndexPattern,
  IndexPatternsContract,
  SavedQuery,
  TimefilterContract,
} from '../../../data/public';
import { EmbeddableStart, ViewMode } from '../../../embeddable/public';
import { NavigationPublicPluginStart } from '../../../navigation/public';
import { SavedObjectLoader, SavedObjectsStart } from '../../../saved_objects/public';
import { SharePluginStart } from '../../../share/public';
import { UrlForwardingStart } from '../../../url_forwarding/public';
import { UsageCollectionSetup } from '../../../usage_collection/public';
import { DashboardSetupDependencies, DashboardStart, DashboardStartDependencies } from '../plugin';
import { IKbnUrlStateStorage, Storage } from '../../../kibana_utils/public';
import { DashboardStateManager } from './dashboard_state_manager';
import { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public';
import { DashboardContainer, DashboardSavedObject } from '..';

export type DashboardRedirect = (props: RedirectToProps) => void;
export type RedirectToProps =
  | { destination: 'dashboard'; id?: string; useReplace?: boolean }
  | { destination: 'listing'; filter?: string; useReplace?: boolean };

export interface DashboardAppProps {
  embedSettings?: DashboardEmbedSettings;
  redirectTo: DashboardRedirect;
  savedDashboardId?: string;
  history: History;
}

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
  isTitleDuplicateConfirmed: boolean;
  onTitleDuplicate: () => void;
}

export interface DashboardAppComponentState {
  savedDashboard?: DashboardSavedObject;
  dashboardStateManager?: DashboardStateManager;
  dashboardContainer?: DashboardContainer;
  indexPatterns?: IndexPattern[];
}

export type DashboardAppComponentActiveState = Required<DashboardAppComponentState>;

export interface DashboardTopNavState {
  chromeIsVisible: boolean;
  savedQuery?: SavedQuery;
}

export type DashboardTopNavProps = Omit<DashboardAppComponentActiveState, 'initialized'> & {
  timefilter: TimefilterContract;
  redirectTo: DashboardRedirect;
  addFromLibrary: () => void;
  updateViewMode: (newViewMode: ViewMode) => void;
  onQuerySubmit: (_payload: unknown, isUpdate: boolean | undefined) => void;
  createNew: () => void;
  lastDashboardId?: string;
  embedSettings?: DashboardEmbedSettings;
};

export interface DashboardListingProps {
  kbnUrlStateStorage: IKbnUrlStateStorage;
  redirectTo: DashboardRedirect;
  initialFilter?: string;
  title?: string;
}

export interface DashboardMountProps {
  appUnMounted: () => void;
  restorePreviousUrl: () => void;
  scopedHistory: ScopedHistory<unknown>;
  element: AppMountParameters['element'];
  initializerContext: PluginInitializerContext;
  onAppLeave: AppMountParameters['onAppLeave'];
  core: CoreSetup<DashboardStartDependencies, DashboardStart>;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  usageCollection: DashboardSetupDependencies['usageCollection'];
}

export interface DashboardCapabilities {
  visualizeCapabilities: { save: boolean };
  mapsCapabilities: { save: boolean };
  hideWriteControls: boolean;
  show: boolean;
  createNew: boolean;
  showWriteControls: boolean;
  createShortUrl: boolean;
  saveQuery: boolean;
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
