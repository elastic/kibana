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
  TimefilterContract,
} from '../../../data/public';
import { EmbeddableStart } from '../../../embeddable/public';
import { KibanaLegacyStart } from '../../../kibana_legacy/public';
import { NavigationPublicPluginStart } from '../../../navigation/public';
import { SavedObjectLoader, SavedObjectsStart } from '../../../saved_objects/public';
import { SharePluginStart } from '../../../share/public';
import { UrlForwardingStart } from '../../../url_forwarding/public';
import { UsageCollectionSetup } from '../../../usage_collection/public';
import { DashboardSetupDependencies, DashboardStart, DashboardStartDependencies } from '../plugin';
import { IKbnUrlStateStorage, Storage } from '../../../kibana_utils/public';
import { DashboardStateManager } from './dashboard_state_manager';
import { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public';
import { DashboardContainer, SavedObjectDashboard } from '..';

export type RedirectToDashboard = (props: RedirectToDashboardProps) => void;

export interface RedirectToDashboardProps {
  id?: string;
  listingFilter?: string;
  useReplace?: boolean;
}
export interface DashboardAppProps {
  savedDashboardId?: string;
  history: History; // TODO: Remove history after state deangularize?
  embedSettings?: DashboardEmbedSettings;
  redirectToDashboard: RedirectToDashboard;
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
  savedDashboard?: SavedObjectDashboard;
  dashboardStateManager?: DashboardStateManager;
  dashboardContainer?: DashboardContainer;
  indexPatterns?: IndexPattern[];
}

export type DashboardAppComponentActiveState = Required<DashboardAppComponentState>;

export type DashboardTopNavProps = Omit<DashboardAppComponentActiveState, 'initialized'> & {
  timefilter: TimefilterContract;
  redirectToDashboard: RedirectToDashboard;
  refreshDashboardContainer: () => void;
  lastDashboardId?: string;
  embedSettings?: DashboardEmbedSettings;
};

export interface DashboardListingProps {
  initialFilter?: string;
  title?: string;
  redirectToDashboard: RedirectToDashboard;
  kbnUrlStateStorage: IKbnUrlStateStorage;
}

export interface DashboardMountProps {
  restorePreviousUrl: () => void;
  appUnMounted: () => void;
  scopedHistory: ScopedHistory<unknown>;
  element: AppMountParameters['element'];
  initializerContext: PluginInitializerContext;
  core: CoreSetup<DashboardStartDependencies, DashboardStart>;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  usageCollection: DashboardSetupDependencies['usageCollection'];
}

export interface DashboardAppServices {
  core: CoreStart;
  chrome: ChromeStart;
  localStorage: Storage;
  embeddable: EmbeddableStart;
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  savedObjects: SavedObjectsStart;
  savedDashboards: SavedObjectLoader;
  indexPatterns: IndexPatternsContract;
  navigation: NavigationPublicPluginStart;
  dashboardCapabilities: any; // TODO: Switch this any out for DashboardCapabilities
  initializerContext: PluginInitializerContext;
  savedObjectsClient: SavedObjectsClientContract;
  dashboardConfig: KibanaLegacyStart['dashboardConfig'];
  savedObjectsTagging?: SavedObjectsTaggingApi;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  navigateToDefaultApp: UrlForwardingStart['navigateToDefaultApp'];
  savedQueryService: DataPublicPluginStart['query']['savedQueries'];
  navigateToLegacyKibanaUrl: UrlForwardingStart['navigateToLegacyKibanaUrl'];

  addBasePath: (path: string) => string;
  scopedHistory: () => ScopedHistory;
  restorePreviousUrl: () => void;

  embeddableCapabilities: {
    visualizeCapabilities: any;
    mapsCapabilities: any;
  };

  usageCollection?: UsageCollectionSetup;
  share?: SharePluginStart;
}
