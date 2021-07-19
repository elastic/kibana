/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../../plugins/saved_objects/public';
import {
  AggConfigOptions,
  IAggConfigs,
  SearchSourceFields,
  TimefilterContract,
} from '../../../plugins/data/public';
import { ExpressionAstExpression } from '../../expressions/public';

import type { SerializedVis, Vis } from './vis';
import type { PersistedState } from './persisted_state';
import type { VisParams } from '../common';

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
