/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { History } from 'history';
import type { AnyAction, Dispatch } from 'redux';
import { BehaviorSubject, Subject } from 'rxjs';
import type { CoreStart } from '../../../core/public';
import { ScopedHistory } from '../../../core/public/application/scoped_history';
import type { AppMountParameters } from '../../../core/public/application/types';
import type { ChromeStart } from '../../../core/public/chrome/types';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import type { SavedObjectsClientContract } from '../../../core/public/saved_objects/saved_objects_client';
import type { IUiSettingsClient } from '../../../core/public/ui_settings/types';
import type { KibanaExecutionContext } from '../../../core/types/execution_context';
import type { Filter } from '../../data/common/es_query';
import { IndexPattern } from '../../data/common/index_patterns/index_patterns/index_pattern';
import type { IndexPatternsContract } from '../../data/common/index_patterns/index_patterns/index_patterns';
import type { RefreshInterval, TimeRange } from '../../data/common/query/timefilter/types';
import type { DataPublicPluginStart } from '../../data/public/types';
import type { EmbeddableInput } from '../../embeddable/common/types';
import { ViewMode } from '../../embeddable/common/types';
import type { ContainerInput } from '../../embeddable/public/lib/containers/i_container';
import type { EmbeddableStart } from '../../embeddable/public/plugin';
import type { IKbnUrlStateStorage } from '../../kibana_utils/public/state_sync/state_sync_state_storage/create_kbn_url_state_storage';
import type { NavigationPublicPluginStart } from '../../navigation/public/types';
import type { SavedObjectsStart } from '../../saved_objects/public/plugin';
import { SavedObjectLoader } from '../../saved_objects/public/saved_object/saved_object_loader';
import type { SavedObjectsTaggingApi } from '../../saved_objects_tagging_oss/public/api';
import type { SharePluginStart } from '../../share/public/plugin';
import type { UrlForwardingStart } from '../../url_forwarding/public/plugin';
import type { UsageCollectionSetup } from '../../usage_collection/public/plugin';
import type { VisualizationsStart } from '../../visualizations/public/plugin';
import type { DashboardPanelState, SavedDashboardPanel } from '../common/types';
import { DashboardContainer } from './application/embeddable/dashboard_container';
import { DashboardSessionStorage } from './application/lib/dashboard_session_storage';
import type { DashboardSavedObject } from './saved_dashboards/saved_dashboard';
import type { Query } from './services/data';

export { SavedDashboardPanel };

export type NavAction = (anchorElement?: any) => void;
export interface SavedDashboardPanelMap {
  [key: string]: SavedDashboardPanel;
}

export interface DashboardPanelMap {
  [key: string]: DashboardPanelState;
}

/**
 * DashboardState contains all pieces of tracked state for an individual dashboard
 */
export interface DashboardState {
  query: Query;
  title: string;
  tags: string[];
  filters: Filter[];
  viewMode: ViewMode;
  description: string;
  savedQuery?: string;
  timeRestore: boolean;
  fullScreenMode: boolean;
  expandedPanelId?: string;
  options: DashboardOptions;
  panels: DashboardPanelMap;
}

/**
 * RawDashboardState is the dashboard state as directly loaded from the panelJSON
 */
export type RawDashboardState = Omit<DashboardState, 'panels'> & { panels: SavedDashboardPanel[] };

export interface DashboardContainerInput extends ContainerInput {
  dashboardCapabilities?: DashboardAppCapabilities;
  refreshConfig?: RefreshInterval;
  isEmbeddedExternally?: boolean;
  isFullScreenMode: boolean;
  expandedPanelId?: string;
  timeRange: TimeRange;
  description?: string;
  useMargins: boolean;
  syncColors?: boolean;
  viewMode: ViewMode;
  filters: Filter[];
  title: string;
  query: Query;
  panels: {
    [panelId: string]: DashboardPanelState<EmbeddableInput & { [k: string]: unknown }>;
  };
  executionContext?: KibanaExecutionContext;
}

/**
 * DashboardAppState contains all the tools the dashboard application uses to track,
 * update, and view its state.
 */
export interface DashboardAppState {
  hasUnsavedChanges?: boolean;
  indexPatterns?: IndexPattern[];
  updateLastSavedState?: () => void;
  resetToLastSavedState?: () => void;
  savedDashboard?: DashboardSavedObject;
  dashboardContainer?: DashboardContainer;
  getLatestDashboardState?: () => DashboardState;
  $triggerDashboardRefresh: Subject<{ force?: boolean }>;
  $onDashboardStateChange: BehaviorSubject<DashboardState>;
  applyFilters?: (query: Query, filters: Filter[]) => void;
}

/**
 * The shared services and tools used to build a dashboard from a saved object ID.
 */
export type DashboardBuildContext = Pick<
  DashboardAppServices,
  | 'embeddable'
  | 'indexPatterns'
  | 'savedDashboards'
  | 'usageCollection'
  | 'initializerContext'
  | 'savedObjectsTagging'
  | 'dashboardCapabilities'
> & {
  query: DashboardAppServices['data']['query'];
  search: DashboardAppServices['data']['search'];
  notifications: DashboardAppServices['core']['notifications'];

  history: History;
  kibanaVersion: string;
  isEmbeddedExternally: boolean;
  kbnUrlStateStorage: IKbnUrlStateStorage;
  $checkForUnsavedChanges: Subject<unknown>;
  getLatestDashboardState: () => DashboardState;
  dispatchDashboardStateChange: Dispatch<AnyAction>;
  $triggerDashboardRefresh: Subject<{ force?: boolean }>;
  $onDashboardStateChange: BehaviorSubject<DashboardState>;
  executionContext?: KibanaExecutionContext;
};

export interface DashboardOptions {
  hidePanelTitles: boolean;
  useMargins: boolean;
  syncColors: boolean;
}

export type DashboardRedirect = (props: RedirectToProps) => void;
export type RedirectToProps =
  | { destination: 'dashboard'; id?: string; useReplace?: boolean; editMode?: boolean }
  | { destination: 'listing'; filter?: string; useReplace?: boolean };

export interface DashboardEmbedSettings {
  forceHideFilterBar?: boolean;
  forceShowTopNavMenu?: boolean;
  forceShowQueryInput?: boolean;
  forceShowDatePicker?: boolean;
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

export interface DashboardAppCapabilities {
  show: boolean;
  createNew: boolean;
  saveQuery: boolean;
  createShortUrl: boolean;
  showWriteControls: boolean;
  storeSearchSession: boolean;
  mapsCapabilities: { save: boolean };
  visualizeCapabilities: { save: boolean };
}

export interface DashboardAppServices {
  core: CoreStart;
  chrome: ChromeStart;
  share?: SharePluginStart;
  embeddable: EmbeddableStart;
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  restorePreviousUrl: () => void;
  savedObjects: SavedObjectsStart;
  allowByValueEmbeddables: boolean;
  urlForwarding: UrlForwardingStart;
  savedDashboards: SavedObjectLoader;
  scopedHistory: () => ScopedHistory;
  visualizations: VisualizationsStart;
  indexPatterns: IndexPatternsContract;
  usageCollection?: UsageCollectionSetup;
  navigation: NavigationPublicPluginStart;
  dashboardCapabilities: DashboardAppCapabilities;
  initializerContext: PluginInitializerContext;
  onAppLeave: AppMountParameters['onAppLeave'];
  savedObjectsTagging?: SavedObjectsTaggingApi;
  savedObjectsClient: SavedObjectsClientContract;
  dashboardSessionStorage: DashboardSessionStorage;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  savedQueryService: DataPublicPluginStart['query']['savedQueries'];
}
