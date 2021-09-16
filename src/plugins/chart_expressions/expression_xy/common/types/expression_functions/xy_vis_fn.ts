/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Fit, Position } from '@elastic/charts';
import { ExpressionValueXYDimension } from '../../../../../visualizations/common/expression_functions/xy_dimension';
import type { Labels, PaletteOutput } from '../../../../../charts/public';
import {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '../../../../../expressions';
import { EXPRESSION_NAME } from '../../constants';
import {
  CategoryAxis,
  Dimensions,
  Grid,
  SeriesParam,
  ThresholdLine,
  TimeMarker,
  ValueAxis,
} from '../param';
import {
  ExpressionValueCategoryAxis,
  ExpressionValueLabel,
  ExpressionValueSeriesParam,
  ExpressionValueThresholdLine,
  ExpressionValueTimeMarker,
  ExpressionValueValueAxis,
  ExpressionValueXDomain,
  XDomainOutput,
} from '../../types';

/**
 * Type of charts able to render
 */
export enum ChartType {
  Line = 'line',
  Area = 'area',
  Histogram = 'histogram',
}

/**
 * Type of xy visualizations
 */
export type XyVisType = ChartType | 'horizontal_bar';

export interface VisTypeXyConfig {
  type: ChartType;
  addLegend: boolean;
  addTooltip: boolean;
  legendPosition: Position;
  addTimeMarker: boolean;
  truncateLegend: boolean;
  maxLegendLines: number;
  categoryAxes: CategoryAxis[];
  orderBucketsBySum?: boolean;
  labels: Labels;
  thresholdLine: ThresholdLine;
  valueAxes: ValueAxis[];
  grid: Grid;
  seriesParams: SeriesParam[];
  dimensions: Dimensions;
  radiusRatio: number;
  times: TimeMarker[]; // For compatibility with vislib
  /**
   * flag to indicate old vislib visualizations
   * used for backwards compatibility including colors
   */
  isVislibVis?: boolean;
  /**
   * Add for detailed tooltip option
   */
  detailedTooltip?: boolean;
  palette: PaletteOutput;
  fillOpacity?: number;
  fittingFunction?: Exclude<Fit, 'explicit'>;
  enableHistogramMode?: boolean;
  xDomain?: XDomainOutput;
}

export interface VisTypeXyRenderConfig {
  visData: Datatable;
  visType: ChartType;
  visConfig: VisTypeXyConfig;
  syncColors: boolean;
}

export interface VisTypeXyArguments {
  type: XyVisType;
  chartType: ChartType;
  gridCategoryLines: boolean;
  gridValueAxis?: string;
  categoryAxes: ExpressionValueCategoryAxis[];
  valueAxes: ExpressionValueValueAxis[];
  seriesParams: ExpressionValueSeriesParam[];
  palette: string;
  addLegend: boolean;
  addTooltip: boolean;
  legendPosition: Position;
  addTimeMarker: boolean;
  truncateLegend: boolean;
  maxLegendLines: number;
  orderBucketsBySum?: boolean;
  labels: ExpressionValueLabel;
  thresholdLine: ExpressionValueThresholdLine;
  radiusRatio: number;
  times: ExpressionValueTimeMarker[]; // For compatibility with vislib
  enableHistogramMode?: boolean;
  /**
   * flag to indicate old vislib visualizations
   * used for backwards compatibility including colors
   */
  isVislibVis?: boolean;
  /**
   * Add for detailed tooltip option
   */
  detailedTooltip?: boolean;
  fittingFunction?: Exclude<Fit, 'explicit'>;
  fillOpacity?: number;
  xDimension: ExpressionValueXYDimension | null;
  yDimension: ExpressionValueXYDimension[];
  zDimension?: ExpressionValueXYDimension[];
  widthDimension?: ExpressionValueXYDimension[];
  seriesDimension?: ExpressionValueXYDimension[];
  splitRowDimension?: ExpressionValueXYDimension[];
  splitColumnDimension?: ExpressionValueXYDimension[];
  xDomain?: ExpressionValueXDomain;
}

export type VisTypeXy = ExpressionFunctionDefinition<
  typeof EXPRESSION_NAME,
  Datatable,
  VisTypeXyArguments,
  ExpressionValueRender<VisTypeXyRenderConfig>
>;
