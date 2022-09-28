/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HorizontalAlignment, LayoutDirection, Position, VerticalAlignment } from '@elastic/charts';
import { $Values } from '@kbn/utility-types';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { KibanaQueryOutput } from '@kbn/data-plugin/common';
import { LegendSize } from '../../constants';

export const XYCurveTypes = {
  LINEAR: 'LINEAR',
  CURVE_MONOTONE_X: 'CURVE_MONOTONE_X',
  CURVE_STEP_AFTER: 'CURVE_STEP_AFTER',
} as const;

export const YAxisModes = {
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
} as const;

export const SeriesTypes = {
  BAR: 'bar',
  LINE: 'line',
  AREA: 'area',
  BAR_STACKED: 'bar_stacked',
  AREA_STACKED: 'area_stacked',
  BAR_HORIZONTAL: 'bar_horizontal',
  BAR_PERCENTAGE_STACKED: 'bar_percentage_stacked',
  BAR_HORIZONTAL_STACKED: 'bar_horizontal_stacked',
  AREA_PERCENTAGE_STACKED: 'area_percentage_stacked',
  BAR_HORIZONTAL_PERCENTAGE_STACKED: 'bar_horizontal_percentage_stacked',
} as const;

export const FillTypes = {
  NONE: 'none',
  ABOVE: 'above',
  BELOW: 'below',
} as const;

export type FillType = $Values<typeof FillTypes>;
export type SeriesType = $Values<typeof SeriesTypes>;
export type YAxisMode = $Values<typeof YAxisModes>;
export type XYCurveType = $Values<typeof XYCurveTypes>;

export interface AxisExtentConfig {
  mode: 'full' | 'custom' | 'dataBounds';
  lowerBound?: number;
  upperBound?: number;
  enforce?: boolean;
}

export interface YConfig {
  forAccessor: string;
  color?: string;
  icon?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted' | 'dot-dashed';
  fill?: FillType;
  iconPosition?: 'auto' | 'left' | 'right' | 'above' | 'below';
  textVisibility?: boolean;
  axisMode?: YAxisMode;
}

export interface XYDataLayerConfig {
  layerId: string;
  accessors: string[];
  layerType: 'data';
  seriesType: SeriesType;
  xAccessor?: string;
  simpleView?: boolean;
  yConfig?: YConfig[];
  splitAccessor?: string;
  palette?: PaletteOutput;
  collapseFn?: string;
  xScaleType?: 'time' | 'linear' | 'ordinal';
  isHistogram?: boolean;
  columnToLabel?: string;
}

export interface XYReferenceLineLayerConfig {
  layerId: string;
  accessors: string[];
  yConfig?: YConfig[];
  layerType: 'referenceLine';
}

export interface EventAnnotationConfig {
  id: string;
  filter: KibanaQueryOutput;
  timeField?: string;
  extraFields?: string[];
  label: string;
  color?: string;
  isHidden?: boolean;
  icon?: string;
  type: 'query';
  key: {
    type: 'point_in_time';
  };
}

export interface XYAnnotationsLayerConfig {
  layerId: string;
  annotations: EventAnnotationConfig[];
  ignoreGlobalFilters: boolean;
  layerType: 'annotations';
  indexPatternId: string;
}

export type XYLayerConfig =
  | XYDataLayerConfig
  | XYReferenceLineLayerConfig
  | XYAnnotationsLayerConfig;

export interface AxesSettingsConfig {
  x: boolean;
  yRight: boolean;
  yLeft: boolean;
}

export interface LabelsOrientationConfig {
  x: number;
  yLeft: number;
  yRight: number;
}

export interface LegendConfig {
  isVisible: boolean;
  position: Position;
  showSingleSeries?: boolean;
  isInside?: boolean;
  horizontalAlignment?: typeof HorizontalAlignment.Right | typeof HorizontalAlignment.Left;
  verticalAlignment?: typeof VerticalAlignment.Top | typeof VerticalAlignment.Bottom;
  floatingColumns?: number;
  maxLines?: number;
  shouldTruncate?: boolean;
  legendSize?: LegendSize;
}

export interface XYConfiguration {
  preferredSeriesType?: SeriesType;
  legend?: LegendConfig;
  valueLabels?: 'hide' | 'show';
  fittingFunction?: 'None' | 'Zero' | 'Linear' | 'Carry' | 'Lookahead' | 'Average' | 'Nearest';
  emphasizeFitting?: boolean;
  endValue?: 'None' | 'Zero' | 'Nearest';
  xExtent?: AxisExtentConfig;
  yLeftExtent?: AxisExtentConfig;
  yRightExtent?: AxisExtentConfig;
  layers: XYLayerConfig[];
  xTitle?: string;
  yTitle?: string;
  yRightTitle?: string;
  yLeftScale?: 'time' | 'linear' | 'log' | 'sqrt';
  yRightScale?: 'time' | 'linear' | 'log' | 'sqrt';
  axisTitlesVisibilitySettings?: AxesSettingsConfig;
  tickLabelsVisibilitySettings?: AxesSettingsConfig;
  gridlinesVisibilitySettings?: AxesSettingsConfig;
  labelsOrientation?: LabelsOrientationConfig;
  curveType?: XYCurveType;
  fillOpacity?: number;
  hideEndzones?: boolean;
  valuesInLegend?: boolean;
}

export interface SortingState {
  columnId: string | undefined;
  direction: 'asc' | 'desc' | 'none';
}

export interface PagingState {
  size: number;
  enabled: boolean;
}

export interface ColumnState {
  columnId: string;
  summaryRow?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  alignment?: 'left' | 'right' | 'center';
  collapseFn?: string;
}

export interface TableVisConfiguration {
  columns: ColumnState[];
  layerId: string;
  layerType: 'data';
  sorting?: SortingState;
  rowHeight?: 'auto' | 'single' | 'custom';
  headerRowHeight?: 'auto' | 'single' | 'custom';
  rowHeightLines?: number;
  headerRowHeightLines?: number;
  paging?: PagingState;
}

export interface MetricVisConfiguration {
  layerId: string;
  layerType: 'data';
  metricAccessor?: string;
  secondaryMetricAccessor?: string;
  maxAccessor?: string;
  breakdownByAccessor?: string;
  // the dimensions can optionally be single numbers
  // computed by collapsing all rows
  collapseFn?: string;
  subtitle?: string;
  secondaryPrefix?: string;
  progressDirection?: LayoutDirection;
  color?: string;
  palette?: PaletteOutput<CustomPaletteParams>;
  maxCols?: number;
}

export type Configuration = XYConfiguration | TableVisConfiguration | MetricVisConfiguration;
