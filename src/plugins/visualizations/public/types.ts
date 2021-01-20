/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObject } from '../../../plugins/saved_objects/public';
import {
  AggConfigOptions,
  SearchSourceFields,
  TimefilterContract,
} from '../../../plugins/data/public';
import { ExpressionAstExpression } from '../../expressions/public';

import { SerializedVis, Vis, VisParams } from './vis';
import { ExprVis } from './expressions/vis';

export { Vis, SerializedVis, VisParams };

export interface VisualizationController {
  render(visData: any, visParams: any): Promise<void>;
  destroy(): void;
  isLoaded?(): Promise<void> | void;
}

export type VisualizationControllerConstructor = new (
  el: HTMLElement,
  vis: ExprVis
) => VisualizationController;

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

export interface VisResponseValue {
  visType: string;
  visData: object;
  visConfig: object;
  params?: object;
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
