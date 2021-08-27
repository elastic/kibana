/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AggConfigOptions } from '../../data/common/search/aggs/agg_config';
import type { IAggConfigs } from '../../data/common/search/aggs/agg_configs';
import type { SearchSourceFields } from '../../data/common/search/search_source/types';
import type { TimefilterContract } from '../../data/public/query/timefilter/timefilter';
import type { ExpressionAstExpression } from '../../expressions/common/ast/types';
import type { SavedObject } from '../../saved_objects/public/types';
import type { VisParams } from '../common/types';
import { PersistedState } from './persisted_state/persisted_state';
import type { SerializedVis } from './vis';
import { Vis } from './vis';

export type { Vis, SerializedVis, VisParams };
export interface SavedVisState {
  title: string;
  type: string;
  params: VisParams;
  aggs: AggConfigOptions[];
}

export interface ISavedVis {
  id?: string;
  title: string;
  description?: string;
  visState: SavedVisState;
  searchSourceFields?: SearchSourceFields;
  uiStateJSON?: string;
  savedSearchRefName?: string;
  savedSearchId?: string;
}

export interface VisSavedObject extends SavedObject, ISavedVis {}

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
