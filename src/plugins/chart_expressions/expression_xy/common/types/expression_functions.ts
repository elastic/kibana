/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HorizontalAlignment, Position, VerticalAlignment } from '@elastic/charts';
import { $Values } from '@kbn/utility-types';
import type { PaletteOutput } from '@kbn/coloring';
import { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { EventAnnotationOutput } from '@kbn/event-annotation-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';

import {
  AxisExtentModes,
  FillStyles,
  FittingFunctions,
  IconPositions,
  LayerTypes,
  LineStyles,
  SeriesTypes,
  ValueLabelModes,
  XScaleTypes,
  XYCurveTypes,
  YAxisModes,
  YScaleTypes,
  REFERENCE_LINE,
  Y_CONFIG,
  AXIS_TITLES_VISIBILITY_CONFIG,
  LABELS_ORIENTATION_CONFIG,
  TICK_LABELS_CONFIG,
  GRID_LINES_CONFIG,
  LEGEND_CONFIG,
  DATA_LAYER,
  AXIS_EXTENT_CONFIG,
  EXTENDED_DATA_LAYER,
  REFERENCE_LINE_LAYER,
  ANNOTATION_LAYER,
  EndValues,
  EXTENDED_Y_CONFIG,
  AvailableReferenceLineIcons,
  XY_VIS,
  LAYERED_XY_VIS,
  EXTENDED_ANNOTATION_LAYER,
  REFERENCE_LINE_Y_CONFIG,
} from '../constants';
import { XYRender } from './expression_renderers';

export type EndValue = $Values<typeof EndValues>;
export type LayerType = $Values<typeof LayerTypes>;
export type YAxisMode = $Values<typeof YAxisModes>;
export type LineStyle = $Values<typeof LineStyles>;
export type FillStyle = $Values<typeof FillStyles>;
export type SeriesType = $Values<typeof SeriesTypes>;
export type YScaleType = $Values<typeof YScaleTypes>;
export type XScaleType = $Values<typeof XScaleTypes>;
export type XYCurveType = $Values<typeof XYCurveTypes>;
export type IconPosition = $Values<typeof IconPositions>;
export type ValueLabelMode = $Values<typeof ValueLabelModes>;
export type AxisExtentMode = $Values<typeof AxisExtentModes>;
export type FittingFunction = $Values<typeof FittingFunctions>;
export type AvailableReferenceLineIcon = $Values<typeof AvailableReferenceLineIcons>;

export interface AxesSettingsConfig {
  x: boolean;
  yLeft: boolean;
  yRight: boolean;
}

export interface AxisExtentConfig {
  mode: AxisExtentMode;
  lowerBound?: number;
  upperBound?: number;
}

export interface AxisConfig {
  title: string;
  hide?: boolean;
}

export interface ExtendedYConfig extends YConfig {
  icon?: AvailableReferenceLineIcon;
  lineWidth?: number;
  lineStyle?: LineStyle;
  fill?: FillStyle;
  iconPosition?: IconPosition;
  textVisibility?: boolean;
}

export interface YConfig {
  forAccessor: string;
  axisMode?: YAxisMode;
  color?: string;
}

export interface DataLayerArgs {
  accessors: Array<ExpressionValueVisDimension | string>;
  seriesType: SeriesType;
  xAccessor?: string | ExpressionValueVisDimension;
  hide?: boolean;
  splitAccessor?: string | ExpressionValueVisDimension;
  markSizeAccessor?: string | ExpressionValueVisDimension;
  lineWidth?: number;
  showPoints?: boolean;
  showLines?: boolean;
  pointsRadius?: number;
  columnToLabel?: string; // Actually a JSON key-value pair
  xScaleType: XScaleType;
  isHistogram: boolean;
  palette: PaletteOutput;
  yConfig?: YConfigResult[];
}

export interface ValidLayer extends DataLayerConfigResult {
  xAccessor: NonNullable<DataLayerConfigResult['xAccessor']>;
}

export interface ExtendedDataLayerArgs {
  layerId?: string;
  accessors: string[];
  seriesType: SeriesType;
  xAccessor?: string;
  hide?: boolean;
  splitAccessor?: string;
  markSizeAccessor?: string;
  lineWidth?: number;
  showPoints?: boolean;
  showLines?: boolean;
  pointsRadius?: number;
  columnToLabel?: string; // Actually a JSON key-value pair
  xScaleType: XScaleType;
  isHistogram: boolean;
  palette: PaletteOutput;
  // palette will always be set on the expression
  yConfig?: YConfigResult[];
  table?: Datatable;
}

export interface LegendConfig {
  /**
   * Flag whether the legend should be shown. If there is just a single series, it will be hidden
   */
  isVisible: boolean;
  /**
   * Position of the legend relative to the chart
   */
  position: Position;
  /**
   * Flag whether the legend should be shown even with just a single series
   */
  showSingleSeries?: boolean;
  /**
   * Flag whether the legend is inside the chart
   */
  isInside?: boolean;
  /**
   * Horizontal Alignment of the legend when it is set inside chart
   */
  horizontalAlignment?: typeof HorizontalAlignment.Right | typeof HorizontalAlignment.Left;
  /**
   * Vertical Alignment of the legend when it is set inside chart
   */
  verticalAlignment?: typeof VerticalAlignment.Top | typeof VerticalAlignment.Bottom;
  /**
   * Number of columns when legend is set inside chart
   */
  floatingColumns?: number;
  /**
   * Maximum number of lines per legend item
   */
  maxLines?: number;

  /**
   * Flag whether the legend items are truncated or not
   */
  shouldTruncate?: boolean;

  /**
   * Exact legend width (vertical) or height (horizontal)
   * Limited to max of 70% of the chart container dimension Vertical legends limited to min of 30% of computed width
   */
  legendSize?: LegendSize;
}

export interface LabelsOrientationConfig {
  x: number;
  yLeft: number;
  yRight: number;
}

// Arguments to XY chart expression, with computed properties
export interface XYArgs extends DataLayerArgs {
  xTitle: string;
  yTitle: string;
  yRightTitle: string;
  xExtent: AxisExtentConfigResult;
  yLeftExtent: AxisExtentConfigResult;
  yRightExtent: AxisExtentConfigResult;
  yLeftScale: YScaleType;
  yRightScale: YScaleType;
  legend: LegendConfigResult;
  endValue?: EndValue;
  emphasizeFitting?: boolean;
  valueLabels: ValueLabelMode;
  referenceLines: ReferenceLineConfigResult[];
  annotationLayers: AnnotationLayerConfigResult[];
  fittingFunction?: FittingFunction;
  axisTitlesVisibilitySettings?: AxisTitlesVisibilityConfigResult;
  tickLabelsVisibilitySettings?: TickLabelsConfigResult;
  gridlinesVisibilitySettings?: GridlinesConfigResult;
  labelsOrientation?: LabelsOrientationConfigResult;
  curveType?: XYCurveType;
  fillOpacity?: number;
  hideEndzones?: boolean;
  valuesInLegend?: boolean;
  ariaLabel?: string;
  addTimeMarker?: boolean;
  markSizeRatio?: number;
  minTimeBarInterval?: string;
  splitRowAccessor?: ExpressionValueVisDimension | string;
  splitColumnAccessor?: ExpressionValueVisDimension | string;
  detailedTooltip?: boolean;
  orderBucketsBySum?: boolean;
  showTooltip: boolean;
}

export interface LayeredXYArgs {
  xTitle: string;
  yTitle: string;
  yRightTitle: string;
  xExtent: AxisExtentConfigResult;
  yLeftExtent: AxisExtentConfigResult;
  yRightExtent: AxisExtentConfigResult;
  yLeftScale: YScaleType;
  yRightScale: YScaleType;
  legend: LegendConfigResult;
  endValue?: EndValue;
  emphasizeFitting?: boolean;
  valueLabels: ValueLabelMode;
  layers?: XYExtendedLayerConfigResult[];
  fittingFunction?: FittingFunction;
  axisTitlesVisibilitySettings?: AxisTitlesVisibilityConfigResult;
  tickLabelsVisibilitySettings?: TickLabelsConfigResult;
  gridlinesVisibilitySettings?: GridlinesConfigResult;
  labelsOrientation?: LabelsOrientationConfigResult;
  curveType?: XYCurveType;
  fillOpacity?: number;
  hideEndzones?: boolean;
  valuesInLegend?: boolean;
  ariaLabel?: string;
  detailedTooltip?: boolean;
  addTimeMarker?: boolean;
  markSizeRatio?: number;
  minTimeBarInterval?: string;
  orderBucketsBySum?: boolean;
  showTooltip: boolean;
}

export interface XYProps {
  xTitle: string;
  yTitle: string;
  yRightTitle: string;
  xExtent: AxisExtentConfigResult;
  yLeftExtent: AxisExtentConfigResult;
  yRightExtent: AxisExtentConfigResult;
  yLeftScale: YScaleType;
  yRightScale: YScaleType;
  legend: LegendConfigResult;
  endValue?: EndValue;
  emphasizeFitting?: boolean;
  valueLabels: ValueLabelMode;
  layers: CommonXYLayerConfig[];
  fittingFunction?: FittingFunction;
  axisTitlesVisibilitySettings?: AxisTitlesVisibilityConfigResult;
  tickLabelsVisibilitySettings?: TickLabelsConfigResult;
  gridlinesVisibilitySettings?: GridlinesConfigResult;
  labelsOrientation?: LabelsOrientationConfigResult;
  curveType?: XYCurveType;
  fillOpacity?: number;
  hideEndzones?: boolean;
  valuesInLegend?: boolean;
  ariaLabel?: string;
  addTimeMarker?: boolean;
  markSizeRatio?: number;
  minTimeBarInterval?: string;
  splitRowAccessor?: ExpressionValueVisDimension | string;
  splitColumnAccessor?: ExpressionValueVisDimension | string;
  detailedTooltip?: boolean;
  orderBucketsBySum?: boolean;
  showTooltip: boolean;
}

export interface AnnotationLayerArgs {
  annotations: EventAnnotationOutput[];
  hide?: boolean;
}

export type ExtendedAnnotationLayerArgs = AnnotationLayerArgs & {
  layerId?: string;
};

export type AnnotationLayerConfigResult = AnnotationLayerArgs & {
  type: typeof ANNOTATION_LAYER;
  layerType: typeof LayerTypes.ANNOTATIONS;
};

export type ExtendedAnnotationLayerConfigResult = ExtendedAnnotationLayerArgs & {
  type: typeof EXTENDED_ANNOTATION_LAYER;
  layerType: typeof LayerTypes.ANNOTATIONS;
};

export interface ReferenceLineArgs extends Omit<ExtendedYConfig, 'forAccessor' | 'fill'> {
  name?: string;
  value: number;
  fill: FillStyle;
}

export interface ReferenceLineLayerArgs {
  layerId?: string;
  accessors: string[];
  columnToLabel?: string;
  yConfig?: ExtendedYConfigResult[];
  table?: Datatable;
}

export type XYLayerArgs = DataLayerArgs | ReferenceLineArgs | AnnotationLayerArgs;
export type XYLayerConfig = DataLayerConfig | ReferenceLineConfig | AnnotationLayerConfig;
export type XYExtendedLayerConfig =
  | ExtendedDataLayerConfig
  | ReferenceLineLayerConfig
  | ExtendedAnnotationLayerConfig;

export type XYExtendedLayerConfigResult =
  | ExtendedDataLayerConfigResult
  | ReferenceLineLayerConfigResult
  | ExtendedAnnotationLayerConfigResult;

export interface ReferenceLineYConfig extends ReferenceLineArgs {
  type: typeof REFERENCE_LINE_Y_CONFIG;
}

export interface ReferenceLineConfigResult {
  type: typeof REFERENCE_LINE;
  layerType: typeof LayerTypes.REFERENCELINE;
  lineLength: number;
  yConfig: [ReferenceLineYConfig];
}

export type ReferenceLineLayerConfigResult = ReferenceLineLayerArgs & {
  type: typeof REFERENCE_LINE_LAYER;
  layerType: typeof LayerTypes.REFERENCELINE;
  table: Datatable;
};

export type DataLayerConfigResult = Omit<DataLayerArgs, 'palette'> & {
  type: typeof DATA_LAYER;
  layerType: typeof LayerTypes.DATA;
  palette: PaletteOutput;
  table: Datatable;
};

export interface WithLayerId {
  layerId: string;
}

export type DataLayerConfig = DataLayerConfigResult & WithLayerId;
export type ReferenceLineConfig = ReferenceLineConfigResult & WithLayerId;
export type AnnotationLayerConfig = AnnotationLayerConfigResult & WithLayerId;

export type ExtendedDataLayerConfig = ExtendedDataLayerConfigResult & WithLayerId;
export type ReferenceLineLayerConfig = ReferenceLineLayerConfigResult & WithLayerId;
export type ExtendedAnnotationLayerConfig = ExtendedAnnotationLayerConfigResult & WithLayerId;

export type ExtendedDataLayerConfigResult = Omit<ExtendedDataLayerArgs, 'palette'> & {
  type: typeof EXTENDED_DATA_LAYER;
  layerType: typeof LayerTypes.DATA;
  palette: PaletteOutput;
  table: Datatable;
};

export type YConfigResult = YConfig & { type: typeof Y_CONFIG };
export type ExtendedYConfigResult = ExtendedYConfig & { type: typeof EXTENDED_Y_CONFIG };

export type AxisTitlesVisibilityConfigResult = AxesSettingsConfig & {
  type: typeof AXIS_TITLES_VISIBILITY_CONFIG;
};

export type LabelsOrientationConfigResult = LabelsOrientationConfig & {
  type: typeof LABELS_ORIENTATION_CONFIG;
};

export type LegendConfigResult = LegendConfig & { type: typeof LEGEND_CONFIG };
export type AxisExtentConfigResult = AxisExtentConfig & { type: typeof AXIS_EXTENT_CONFIG };
export type GridlinesConfigResult = AxesSettingsConfig & { type: typeof GRID_LINES_CONFIG };
export type TickLabelsConfigResult = AxesSettingsConfig & { type: typeof TICK_LABELS_CONFIG };

export type CommonXYLayerConfig = XYLayerConfig | XYExtendedLayerConfig;
export type CommonXYDataLayerConfigResult = DataLayerConfigResult | ExtendedDataLayerConfigResult;
export type CommonXYReferenceLineLayerConfigResult =
  | ReferenceLineConfigResult
  | ReferenceLineLayerConfigResult;

export type CommonXYDataLayerConfig = DataLayerConfig | ExtendedDataLayerConfig;
export type CommonXYReferenceLineLayerConfig = ReferenceLineConfig | ReferenceLineLayerConfig;

export type CommonXYAnnotationLayerConfig = AnnotationLayerConfig | ExtendedAnnotationLayerConfig;

export type XyVisFn = ExpressionFunctionDefinition<
  typeof XY_VIS,
  Datatable,
  XYArgs,
  Promise<XYRender>
>;
export type LayeredXyVisFn = ExpressionFunctionDefinition<
  typeof LAYERED_XY_VIS,
  Datatable,
  LayeredXYArgs,
  Promise<XYRender>
>;

export type ExtendedDataLayerFn = ExpressionFunctionDefinition<
  typeof EXTENDED_DATA_LAYER,
  Datatable,
  ExtendedDataLayerArgs,
  Promise<ExtendedDataLayerConfigResult>
>;

export type ReferenceLineFn = ExpressionFunctionDefinition<
  typeof REFERENCE_LINE,
  Datatable | null,
  ReferenceLineArgs,
  ReferenceLineConfigResult
>;
export type ReferenceLineLayerFn = ExpressionFunctionDefinition<
  typeof REFERENCE_LINE_LAYER,
  Datatable,
  ReferenceLineLayerArgs,
  Promise<ReferenceLineLayerConfigResult>
>;

export type YConfigFn = ExpressionFunctionDefinition<typeof Y_CONFIG, null, YConfig, YConfigResult>;
export type ExtendedYConfigFn = ExpressionFunctionDefinition<
  typeof EXTENDED_Y_CONFIG,
  null,
  ExtendedYConfig,
  ExtendedYConfigResult
>;

export type LegendConfigFn = ExpressionFunctionDefinition<
  typeof LEGEND_CONFIG,
  null,
  LegendConfig,
  Promise<LegendConfigResult>
>;
