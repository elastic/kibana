/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Position } from '@elastic/charts';
import {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '../../../../expressions';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';

import { CustomPaletteState, PaletteOutput } from '../../../../charts/common';
import {
  EXPRESSION_HEATMAP_NAME,
  EXPRESSION_HEATMAP_LEGEND_NAME,
  EXPRESSION_HEATMAP_GRID_NAME,
  HEATMAP_FUNCTION_RENDERER_NAME,
} from '../constants';

export interface HeatmapLegendConfig {
  /**
   * Flag whether the legend should be shown. If there is just a single series, it will be hidden
   */
  isVisible: boolean;
  /**
   * Position of the legend relative to the chart
   */
  position: Position;
  /**
   * Defines the number of lines per legend item
   */
  maxLines?: number;
  /**
   * Defines if the legend items should be truncated
   */
  shouldTruncate?: boolean;
  /**
   * Exact legend width (vertical) or height (horizontal)
   * Limited to max of 70% of the chart container dimension Vertical legends limited to min of 30% of computed width
   */
  legendSize?: number;
}

export type HeatmapLegendConfigResult = HeatmapLegendConfig & {
  type: typeof EXPRESSION_HEATMAP_LEGEND_NAME;
};

export interface HeatmapGridConfig {
  // grid
  strokeWidth?: number;
  strokeColor?: string;
  // cells
  isCellLabelVisible: boolean;
  // Y-axis
  isYAxisLabelVisible: boolean;
  isYAxisTitleVisible: boolean;
  yTitle?: string;
  // X-axis
  isXAxisLabelVisible: boolean;
  isXAxisTitleVisible: boolean;
  xTitle?: string;
}

export type HeatmapGridConfigResult = HeatmapGridConfig & {
  type: typeof EXPRESSION_HEATMAP_GRID_NAME;
};

export interface HeatmapArguments {
  percentageMode?: boolean;
  lastRangeIsRightOpen?: boolean;
  showTooltip?: boolean;
  highlightInHover?: boolean;
  palette?: PaletteOutput<CustomPaletteState>;
  xAccessor?: string | ExpressionValueVisDimension;
  yAccessor?: string | ExpressionValueVisDimension;
  valueAccessor?: string | ExpressionValueVisDimension;
  splitRowAccessor?: string | ExpressionValueVisDimension;
  splitColumnAccessor?: string | ExpressionValueVisDimension;
  legend: HeatmapLegendConfigResult;
  gridConfig: HeatmapGridConfigResult;
  ariaLabel?: string;
}

export type HeatmapInput = Datatable;

export interface HeatmapExpressionProps {
  data: Datatable;
  args: HeatmapArguments;
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
  ExpressionValueRender<HeatmapExpressionProps>
>;
