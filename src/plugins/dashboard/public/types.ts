/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AppMountParameters,
  CoreStart,
  SavedObjectsClientContract,
  ScopedHistory,
  ChromeStart,
  IUiSettingsClient,
  PluginInitializerContext,
  KibanaExecutionContext,
} from 'kibana/public';
import { History } from 'history';
import { AnyAction, Dispatch } from 'redux';
import { BehaviorSubject, Subject } from 'rxjs';
import { Query, Filter, IndexPattern, RefreshInterval, TimeRange } from './services/data';
import { ContainerInput, EmbeddableInput, ViewMode } from './services/embeddable';
import { SharePluginStart } from './services/share';
import { EmbeddableStart } from './services/embeddable';
import { DashboardSessionStorage } from './application/lib';
import { UrlForwardingStart } from '../../url_forwarding/public';
import { UsageCollectionSetup } from './services/usage_collection';
import { NavigationPublicPluginStart } from './services/navigation';
import { DashboardPanelState, SavedDashboardPanel } from '../common/types';
import { SavedObjectsTaggingApi } from './services/saved_objects_tagging_oss';
import { DataPublicPluginStart, IndexPatternsContract } from './services/data';
import { SavedObjectLoader, SavedObjectsStart } from './services/saved_objects';
import { IKbnUrlStateStorage } from './services/kibana_utils';
import { DashboardContainer, DashboardSavedObject } from '.';
import { VisualizationsStart } from '../../visualizations/public';
import { DashboardAppLocatorParams } from './locator';

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

  locatorState?: DashboardAppLocatorParams;

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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DashboardOptions = {
  hidePanelTitles: boolean;
  useMargins: boolean;
  syncColors: boolean;
};

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
