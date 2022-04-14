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
import { Datatable } from '../../../../expressions';
import { EventAnnotationOutput } from '../../../../event_annotation/common';
import {
  AxisExtentModes,
  FillStyles,
  FittingFunctions,
  IconPositions,
  LayerTypes,
  MULTITABLE,
  LineStyles,
  SeriesTypes,
  ValueLabelModes,
  XScaleTypes,
  XYCurveTypes,
  YAxisModes,
  YScaleTypes,
  REFERENCE_LINE_LAYER,
  Y_CONFIG,
  AXIS_TITLES_VISIBILITY_CONFIG,
  LABELS_ORIENTATION_CONFIG,
  TICK_LABELS_CONFIG,
  GRID_LINES_CONFIG,
  LEGEND_CONFIG,
  DATA_LAYER,
  AXIS_EXTENT_CONFIG,
  ANNOTATION_LAYER,
  EndValues,
} from '../constants';

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

export interface YConfig {
  forAccessor: string;
  axisMode?: YAxisMode;
  color?: string;
  icon?: string;
  lineWidth?: number;
  lineStyle?: LineStyle;
  fill?: FillStyle;
  iconPosition?: IconPosition;
  textVisibility?: boolean;
}

export interface ValidLayer extends DataLayerConfigResult {
  xAccessor: NonNullable<DataLayerConfigResult['xAccessor']>;
}

export interface DataLayerArgs {
  layerId: string;
  accessors: string[];
  seriesType: SeriesType;
  xAccessor?: string;
  hide?: boolean;
  splitAccessor?: string;
  columnToLabel?: string; // Actually a JSON key-value pair
  yScaleType: YScaleType;
  xScaleType: XScaleType;
  isHistogram: boolean;
  // palette will always be set on the expression
  palette: PaletteOutput;
  yConfig?: YConfigResult[];
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
  horizontalAlignment?: HorizontalAlignment;
  /**
   * Vertical Alignment of the legend when it is set inside chart
   */
  verticalAlignment?: VerticalAlignment;
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
  legendSize?: number;
}

export interface LabelsOrientationConfig {
  x: number;
  yLeft: number;
  yRight: number;
}

// Arguments to XY chart expression, with computed properties
export interface XYArgs {
  title?: string;
  description?: string;
  xTitle: string;
  yTitle: string;
  yRightTitle: string;
  yLeftExtent: AxisExtentConfigResult;
  yRightExtent: AxisExtentConfigResult;
  legend: LegendConfigResult;
  valueLabels: ValueLabelMode;
  layers: XYLayerConfigResult[];
  endValue?: EndValue;
  emphasizeFitting?: boolean;
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
}

export interface AnnotationLayerArgs {
  annotations: EventAnnotationOutput[];
  layerId: string;
  hide?: boolean;
}

export type AnnotationLayerConfigResult = AnnotationLayerArgs & {
  type: typeof ANNOTATION_LAYER;
  layerType: typeof LayerTypes.ANNOTATIONS;
};

export interface ReferenceLineLayerArgs {
  layerId: string;
  accessors: string[];
  columnToLabel?: string;
  yConfig?: YConfigResult[];
}

export type XYLayerArgs = DataLayerArgs | ReferenceLineLayerArgs | AnnotationLayerArgs;

export type XYLayerConfigResult =
  | DataLayerConfigResult
  | ReferenceLineLayerConfigResult
  | AnnotationLayerConfigResult;

export interface LensMultiTable {
  type: typeof MULTITABLE;
  tables: Record<string, Datatable>;
  dateRange?: {
    fromDate: Date;
    toDate: Date;
  };
}

export type ReferenceLineLayerConfigResult = ReferenceLineLayerArgs & {
  type: typeof REFERENCE_LINE_LAYER;
  layerType: typeof LayerTypes.REFERENCELINE;
};

export type DataLayerConfigResult = DataLayerArgs & {
  type: typeof DATA_LAYER;
  layerType: typeof LayerTypes.DATA;
};

export type YConfigResult = YConfig & { type: typeof Y_CONFIG };

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
