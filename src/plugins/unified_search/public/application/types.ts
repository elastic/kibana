/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { History } from 'history';

import type {
  CoreStart,
  PluginInitializerContext,
  ChromeStart,
  ToastsStart,
  ScopedHistory,
  AppMountParameters,
} from 'kibana/public';

import type { VisualizationsStart } from 'src/plugins/visualizations/public';

import type { Storage, IKbnUrlStateStorage } from 'src/plugins/kibana_utils/public';

import type { NavigationPublicPluginStart as NavigationStart } from 'src/plugins/navigation/public';
import type { Query, Filter, DataPublicPluginStart, TimeRange } from 'src/plugins/data/public';
import type { SavedObjectsStart } from 'src/plugins/saved_objects/public';
import type { EmbeddableStart, EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import type { UrlForwardingStart } from 'src/plugins/url_forwarding/public';
import type { DashboardStart } from '../../../dashboard/public';
import type { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public';
import type { UsageCollectionStart } from '../../../usage_collection/public';

export interface UnifiedSearchAppState {
  filters: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  savedQuery?: string;
}

export interface UnifiedSearchServices extends CoreStart {
  stateTransferService: EmbeddableStateTransfer;
  embeddable: EmbeddableStart;
  history: History;
  kbnUrlStateStorage: IKbnUrlStateStorage;
  urlForwarding: UrlForwardingStart;
  pluginInitializerContext: PluginInitializerContext;
  chrome: ChromeStart;
  data: DataPublicPluginStart;
  localStorage: Storage;
  navigation: NavigationStart;
  toastNotifications: ToastsStart;
  visualizeCapabilities: Record<string, boolean | Record<string, boolean>>;
  dashboardCapabilities: Record<string, boolean | Record<string, boolean>>;
  visualizations: VisualizationsStart;
  savedObjectsPublic: SavedObjectsStart;
  setActiveUrl: (newUrl: string) => void;
  restorePreviousUrl: () => void;
  scopedHistory: ScopedHistory;
  dashboard: DashboardStart;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  savedObjectsTagging?: SavedObjectsTaggingApi;
  usageCollection?: UsageCollectionStart;
  getKibanaVersion: () => string;
}
