/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Datatable,
  DefaultInspectorAdapters,
  ExecutionContext,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '@kbn/expressions-plugin/common';
import {
  type HeatmapExpressionLayerState as HeatmapArguments,
  type HeatmapLegendConfigResult,
  type HeatmapGridConfigResult,
  EXPRESSION_HEATMAP_LEGEND_NAME,
  EXPRESSION_HEATMAP_GRID_NAME,
  EXPRESSION_HEATMAP_NAME,
} from '@kbn/visualizations-plugin/common';
import { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import { HEATMAP_FUNCTION_RENDERER_NAME } from '../constants';

export type HeatmapLegendConfig = Omit<HeatmapLegendConfigResult, 'type'>;
export type HeatmapGridConfig = Omit<HeatmapGridConfigResult, 'type'>;

export type HeatmapInput = Datatable;

export interface HeatmapExpressionProps {
  data: Datatable;
  args: HeatmapArguments;
  syncTooltips: boolean;
  syncCursor: boolean;
  canNavigateToLens?: boolean;
  overrides?: AllowedSettingsOverrides & AllowedChartOverrides;
}

export interface HeatmapRender {
  type: 'render';
  as: typeof HEATMAP_FUNCTION_RENDERER_NAME;
  value: HeatmapExpressionProps;
}

export type HeatmapExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_HEATMAP_NAME,
  HeatmapInput,
  HeatmapArguments,
  ExpressionValueRender<HeatmapExpressionProps>,
  ExecutionContext<DefaultInspectorAdapters>
>;

export type HeatmapLegendExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_HEATMAP_LEGEND_NAME,
  null,
  HeatmapLegendConfig,
  HeatmapLegendConfigResult
>;

export type HeatmapGridExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_HEATMAP_GRID_NAME,
  null,
  HeatmapGridConfig,
  HeatmapGridConfigResult
>;
