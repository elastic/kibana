/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { ExpressionValueVisDimension, LegendSize } from '@kbn/chart-expressions-common';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { Position } from '@elastic/charts';
import type { LensLayerType } from '../types';
import type { HEATMAP_LEGEND_NAME, HEATMAP_GRID_NAME } from './constants';

export type HeatmapChartShapes = 'heatmap';

export interface HeatmapLegendConfigResult {
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
  legendSize?: LegendSize;
  // type flag
  type: typeof HEATMAP_LEGEND_NAME;
}

export interface HeatmapGridConfigResult {
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
  xAxisLabelRotation?: number;
  isXAxisTitleVisible: boolean;
  xTitle?: string;
  // type flag
  type: typeof HEATMAP_GRID_NAME;
}

export type HeatmapPalette = PaletteOutput<CustomPaletteParams> & { accessor: string };

export interface HeatmapExpressionLayerState {
  layerId: string;
  layerType: LensLayerType;
  xAccessor?: string | ExpressionValueVisDimension;
  yAccessor?: string | ExpressionValueVisDimension;
  valueAccessor?: string | ExpressionValueVisDimension;
  splitRowAccessor?: string | ExpressionValueVisDimension;
  splitColumnAccessor?: string | ExpressionValueVisDimension;
  palette?: PaletteOutput<CustomPaletteState>;
  shape: HeatmapChartShapes;
  percentageMode?: boolean;
  lastRangeIsRightOpen?: boolean;
  showTooltip?: boolean;
  highlightInHover?: boolean;
  legend: HeatmapLegendConfigResult;
  gridConfig: HeatmapGridConfigResult;
  ariaLabel?: string;
}

export type HeatmapVisualizationState = Omit<HeatmapExpressionLayerState, 'palette'> & {
  xAccessor?: string;
  yAccessor?: string;
  valueAccessor?: string;
  splitRowAccessor?: string;
  splitColumnAccessor?: string;
  // need to store the current accessor to reset the color stops at accessor change
  palette?: HeatmapPalette;
};
