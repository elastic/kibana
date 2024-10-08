/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreStart,
  SavedObjectsMigrationVersion,
  ResolvedSimpleSavedObject,
} from '@kbn/core/public';
import {
  IAggConfigs,
  SerializedSearchSourceFields,
  TimefilterContract,
  AggConfigSerialized,
} from '@kbn/data-plugin/public';
import type { ISearchSource } from '@kbn/data-plugin/common';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/public';

import type { TableListTab } from '@kbn/content-management-tabbed-table-list-view';
import type { Vis } from './vis';
import type { PersistedState } from './persisted_state';
import type { VisParams, SerializedVis } from '../common';

export type StartServices = Pick<
  CoreStart,
  // used extensively in visualizations
  | 'overlays'
  // used for react rendering utilities
  | 'analytics'
  | 'i18n'
  | 'theme'
>;

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
    outcome?: ResolvedSimpleSavedObject['outcome'];
    aliasTargetId?: ResolvedSimpleSavedObject['alias_target_id'];
    aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
    errorJSON?: string;
  };
}

export interface VisSavedObject extends ISavedVis {
  lastSavedTitle: string;
  getEsType: () => string;
  getDisplayName: () => string;
  displayName: string;
  migrationVersion?: SavedObjectsMigrationVersion;
  searchSource?: ISearchSource;
  version?: string;
  tags?: string[];
  managed: boolean;
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

export type VisToExpressionAst<TVisParams extends VisParams = VisParams> = (
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

export type ListingViewRegistry = Pick<Set<TableListTab>, 'add'>;
