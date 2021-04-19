/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import { SharePluginStart } from '../services/share';
import { EmbeddableStart } from '../services/embeddable';
import { UsageCollectionSetup } from '../services/usage_collection';
import { NavigationPublicPluginStart } from '../services/navigation';
import { SavedObjectsTaggingApi } from '../services/saved_objects_tagging_oss';
import { DataPublicPluginStart, IndexPatternsContract } from '../services/data';
import { SavedObjectLoader, SavedObjectsStart } from '../services/saved_objects';
import { DashboardPanelStorage } from './lib';
import { UrlForwardingStart } from '../../../url_forwarding/public';
import { VisualizationsStart } from '../../../visualizations/public';

export type DashboardRedirect = (props: RedirectToProps) => void;
export type RedirectToProps =
  | { destination: 'dashboard'; id?: string; useReplace?: boolean; editMode?: boolean }
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
  createShortUrl: boolean;
  saveQuery: boolean;
  createNew: boolean;
  show: boolean;
  storeSearchSession: boolean;
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
  indexPatterns: IndexPatternsContract;
  usageCollection?: UsageCollectionSetup;
  navigation: NavigationPublicPluginStart;
  dashboardPanelStorage: DashboardPanelStorage;
  dashboardCapabilities: DashboardCapabilities;
  initializerContext: PluginInitializerContext;
  onAppLeave: AppMountParameters['onAppLeave'];
  savedObjectsTagging?: SavedObjectsTaggingApi;
  savedObjectsClient: SavedObjectsClientContract;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  savedQueryService: DataPublicPluginStart['query']['savedQueries'];
  visualizations: VisualizationsStart;
}
