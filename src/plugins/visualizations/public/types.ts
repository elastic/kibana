/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsMigrationVersion } from 'kibana/public';

import {
  AppMountParameters,
  ChromeStart,
  CoreStart,
  PluginInitializerContext,
  ScopedHistory,
  ToastsStart,
} from 'kibana/public';
import type { Storage, IKbnUrlStateStorage } from 'src/plugins/kibana_utils/public';
import { History } from 'history';
import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { SharePluginStart } from 'src/plugins/share/public';
import type { SavedObjectsStart } from 'src/plugins/saved_objects/public';
import type { EmbeddableStart, EmbeddableStateTransfer } from 'src/plugins/embeddable/public';
import type { UrlForwardingStart } from 'src/plugins/url_forwarding/public';
import type { PresentationUtilPluginStart } from 'src/plugins/presentation_util/public';
import type { NavigationPublicPluginStart as NavigationStart } from 'src/plugins/navigation/public';
import type { SpacesPluginStart } from '../../../../x-pack/plugins/spaces/public';
import type { UsageCollectionStart } from '../../usage_collection/public';
import type { SavedObjectsTaggingApi } from '../../saved_objects_tagging_oss/public';
import type { DashboardStart } from '../../dashboard/public';
import type { VisParams } from '../common';
import type { PersistedState } from './persisted_state';
import type { SerializedVis, Vis } from './vis';
import { ExpressionAstExpression } from '../../expressions/public';
import type { ISearchSource } from '../../data/common';
import {
  IAggConfigs,
  SerializedSearchSourceFields,
  TimefilterContract,
  AggConfigSerialized,
} from '../../../plugins/data/public';

export type { Vis, SerializedVis, VisParams };
export interface SavedVisState {
  title: string;
  type: string;
  params: VisParams;
  aggs: AggConfigSerialized[];
}

export interface ISavedVis {
  id?: string;
  title: string;
  description?: string;
  visState: SavedVisState;
  searchSourceFields?: SerializedSearchSourceFields;
  uiStateJSON?: string;
  savedSearchRefName?: string;
  savedSearchId?: string;
  sharingSavedObjectProps?: {
    outcome?: 'aliasMatch' | 'exactMatch' | 'conflict';
    aliasTargetId?: string;
    errorJSON?: string;
  };
}

export interface VisSavedObject extends ISavedVis {
  lastSavedTitle: string;
  getEsType: () => string;
  getDisplayName?: () => string;
  displayName: string;
  migrationVersion?: SavedObjectsMigrationVersion;
  searchSource?: ISearchSource;
  version?: string;
  tags?: string[];
}

export interface SaveVisOptions {
  confirmOverwrite?: boolean;
  isTitleDuplicateConfirmed?: boolean;
  onTitleDuplicate?: () => void;
  copyOnSave?: boolean;
}

export interface GetVisOptions {
  id?: string;
  searchSource?: boolean;
  migrationVersion?: SavedObjectsMigrationVersion;
  savedSearchId?: string;
  type?: string;
  indexPattern?: string;
}

export interface VisToExpressionAstParams {
  timefilter: TimefilterContract;
  timeRange?: any;
  abortSignal?: AbortSignal;
}

export type VisToExpressionAst<TVisParams = VisParams> = (
  vis: Vis<TVisParams>,
  params: VisToExpressionAstParams
) => Promise<ExpressionAstExpression> | ExpressionAstExpression;

export interface VisEditorOptionsProps<VisParamType = unknown> {
  aggs: IAggConfigs;
  hasHistogramAgg: boolean;
  isTabSelected: boolean;
  stateParams: VisParamType;
  vis: Vis;
  uiState: PersistedState;
  setValue<T extends keyof VisParamType>(paramName: T, value: VisParamType[T]): void;
  setValidity(isValid: boolean): void;
  setTouched(isTouched: boolean): void;
}

export interface VisualizationServices extends CoreStart {
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
  share?: SharePluginStart;
  visualizeCapabilities: Record<string, boolean | Record<string, boolean>>;
  dashboardCapabilities: Record<string, boolean | Record<string, boolean>>;
  savedObjectsPublic: SavedObjectsStart;
  setActiveUrl: (newUrl: string) => void;
  restorePreviousUrl: () => void;
  scopedHistory: ScopedHistory;
  dashboard: DashboardStart;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  savedObjectsTagging?: SavedObjectsTaggingApi;
  presentationUtil: PresentationUtilPluginStart;
  usageCollection?: UsageCollectionStart;
  getKibanaVersion: () => string;
  spaces?: SpacesPluginStart;
}
