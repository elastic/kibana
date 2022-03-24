/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsMigrationVersion, SavedObjectsResolveResponse } from 'src/core/public';
import {
  IAggConfigs,
  SerializedSearchSourceFields,
  TimefilterContract,
  AggConfigSerialized,
} from '../../../plugins/data/public';
import type { ISearchSource } from '../../data/common';
import { ExpressionAstExpression } from '../../expressions/public';

import type { Vis } from './vis';
import type { PersistedState } from './persisted_state';
import type { VisParams, SerializedVis } from '../common';

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
    outcome?: SavedObjectsResolveResponse['outcome'];
    aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
    aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
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
