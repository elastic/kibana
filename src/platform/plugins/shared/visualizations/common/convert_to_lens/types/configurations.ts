/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HorizontalAlignment, LayoutDirection, Position, VerticalAlignment } from '@elastic/charts';
import { $Values } from '@kbn/utility-types';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { KibanaQueryOutput } from '@kbn/data-plugin/common';
import { LegendSize, type XYLegendValue, type PartitionLegendValue } from '../../constants';
import {
  CategoryDisplayTypes,
  PartitionChartTypes,
  NumberDisplayTypes,
  LegendDisplayTypes,
  FillTypes,
  SeriesTypes,
  YAxisModes,
  XYCurveTypes,
  LayerTypes,
  GaugeShapes,
  GaugeTicksPositions,
  GaugeLabelMajorModes,
  GaugeColorModes,
  GaugeCentralMajorModes,
  CollapseFunctions,
} from '../constants';
import { ExpressionValueVisDimension } from '../../expression_functions';

export type ChartShapes = 'heatmap';

export type CollapseFunction = (typeof CollapseFunctions)[number];

export type FillType = $Values<typeof FillTypes>;
export type SeriesType = $Values<typeof SeriesTypes>;
export type YAxisMode = $Values<typeof YAxisModes>;
export type XYCurveType = $Values<typeof XYCurveTypes>;
export type PartitionChartType = $Values<typeof PartitionChartTypes>;
export type CategoryDisplayType = $Values<typeof CategoryDisplayTypes>;
export type NumberDisplayType = $Values<typeof NumberDisplayTypes>;
export type LegendDisplayType = $Values<typeof LegendDisplayTypes>;
export type LayerType = $Values<typeof LayerTypes>;
export type GaugeColorMode = $Values<typeof GaugeColorModes>;
export type GaugeShape = $Values<typeof GaugeShapes>;
export type GaugeLabelMajorMode = $Values<typeof GaugeLabelMajorModes>;
export type GaugeCentralMajorMode = $Values<typeof GaugeCentralMajorModes>;
export type GaugeTicksPosition = $Values<typeof GaugeTicksPositions>;

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
  lineStyle?: 'solid' | 'dashed' | 'dotted';
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
  collapseFn?: CollapseFunction;
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
  icon?: (() => JSX.Element) | string;
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
  legendStats?: XYLegendValue[];
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
  minBarHeight?: number;
  hideEndzones?: boolean;
  showCurrentTimeMarker?: boolean;
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
  collapseFn?: CollapseFunction;
  palette?: PaletteOutput<CustomPaletteParams>;
}

enum RowHeightMode {
  auto = 'auto',
  custom = 'custom',
}

export interface TableVisConfiguration {
  columns: ColumnState[];
  layerId: string;
  layerType: 'data';
  sorting?: SortingState;
  rowHeight?: RowHeightMode;
  headerRowHeight?: RowHeightMode;
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
  collapseFn?: CollapseFunction;
  subtitle?: string;
  secondaryPrefix?: string;
  progressDirection?: LayoutDirection;
  showBar?: boolean;
  color?: string;
  palette?: PaletteOutput<CustomPaletteParams>;
  maxCols?: number;
}

export interface PartitionLayerState {
  layerId: string;
  layerType: LayerType;
  metrics: string[];
  primaryGroups: string[];
  secondaryGroups?: string[];
  collapseFns?: Record<string, CollapseFunction>;
  numberDisplay: NumberDisplayType;
  categoryDisplay: CategoryDisplayType;
  legendDisplay: LegendDisplayType;
  legendPosition?: Position;
  legendStats?: PartitionLegendValue[];
  nestedLegend?: boolean;
  percentDecimals?: number;
  emptySizeRatio?: number;
  legendMaxLines?: number;
  legendSize?: LegendSize;
  truncateLegend?: boolean;
}

export interface PartitionVisConfiguration {
  shape: PartitionChartType;
  layers: PartitionLayerState[];
  palette?: PaletteOutput;
}

export const LENS_GAUGE_ID = 'lnsGauge';

export const GROUP_ID = {
  METRIC: 'metric',
  MIN: 'min',
  MAX: 'max',
  GOAL: 'goal',
} as const;

interface GaugeState {
  metricAccessor?: string;
  minAccessor?: string;
  maxAccessor?: string;
  goalAccessor?: string;
  ticksPosition: GaugeTicksPosition;
  labelMajorMode: GaugeLabelMajorMode;
  labelMajor?: string;
  labelMinor?: string;
  centralMajorMode?: GaugeCentralMajorMode;
  centralMajor?: string;
  colorMode?: GaugeColorMode;
  palette?: PaletteOutput<CustomPaletteParams>;
  shape: GaugeShape;
  /** @deprecated This field is deprecated and going to be removed in the futher release versions. */
  percentageMode?: boolean;
  respectRanges?: boolean;
  commonLabel?: string;
}

export type GaugeVisConfiguration = GaugeState & {
  layerId: string;
  layerType: typeof LayerTypes.DATA;
};

export interface HeatmapLegendConfig {
  isVisible: boolean;
  position: Position;
  maxLines?: number;
  shouldTruncate?: boolean;
  legendSize?: LegendSize;
  type: 'heatmap_legend';
}

export interface HeatmapGridConfig {
  strokeWidth?: number;
  strokeColor?: string;
  isCellLabelVisible: boolean;
  isYAxisLabelVisible: boolean;
  isYAxisTitleVisible: boolean;
  yTitle?: string;
  isXAxisLabelVisible: boolean;
  isXAxisTitleVisible: boolean;
  xTitle?: string;
  type: 'heatmap_grid';
}
export interface HeatmapArguments {
  percentageMode?: boolean;
  lastRangeIsRightOpen?: boolean;
  showTooltip?: boolean;
  highlightInHover?: boolean;
  palette?: PaletteOutput<CustomPaletteParams>;
  xAccessor?: string | ExpressionValueVisDimension;
  yAccessor?: string | ExpressionValueVisDimension;
  valueAccessor?: string | ExpressionValueVisDimension;
  splitRowAccessor?: string | ExpressionValueVisDimension;
  splitColumnAccessor?: string | ExpressionValueVisDimension;
  legend: HeatmapLegendConfig;
  gridConfig: HeatmapGridConfig;
  ariaLabel?: string;
}

export type HeatmapLayerState = HeatmapArguments & {
  layerId: string;
  layerType: LayerType;
  valueAccessor?: string;
  xAccessor?: string;
  yAccessor?: string;
  shape: ChartShapes;
};

export type Palette = PaletteOutput<CustomPaletteParams> & { accessor: string };

export type HeatmapConfiguration = HeatmapLayerState & {
  // need to store the current accessor to reset the color stops at accessor change
  palette?: Palette;
};

export interface TagcloudVisConfiguration {
  layerId: string;
  layerType: LayerType;
  valueAccessor: string;
  tagAccessor: string;
  maxFontSize: number;
  minFontSize: number;
  orientation: string;
  palette: PaletteOutput;
  showLabel: boolean;
}

export type Configuration =
  | XYConfiguration
  | TableVisConfiguration
  | PartitionVisConfiguration
  | MetricVisConfiguration
  | GaugeVisConfiguration
  | HeatmapConfiguration
  | TagcloudVisConfiguration;
