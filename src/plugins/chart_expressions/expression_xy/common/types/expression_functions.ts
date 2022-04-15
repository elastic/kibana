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
  YScaleTypes,
  AxisModes,
  REFERENCE_LINE_LAYER,
  Y_CONFIG,
  LEGEND_CONFIG,
  DATA_LAYER,
  AXIS_EXTENT_CONFIG,
  EXTENDED_DATA_LAYER,
  EXTENDED_REFERENCE_LINE_LAYER,
  ANNOTATION_LAYER,
  EndValues,
  EXTENDED_ANNOTATION_LAYER,
  X_AXIS_CONFIG,
  Y_AXIS_CONFIG,
  EXTENDED_Y_CONFIG,
  AvailableReferenceLineIcons,
} from '../constants';

export type EndValue = $Values<typeof EndValues>;
export type LayerType = $Values<typeof LayerTypes>;
export type LineStyle = $Values<typeof LineStyles>;
export type FillStyle = $Values<typeof FillStyles>;
export type SeriesType = $Values<typeof SeriesTypes>;
export type YScaleType = $Values<typeof YScaleTypes>;
export type XScaleType = $Values<typeof XScaleTypes>;
export type AxisMode = $Values<typeof AxisModes>;
export type XYCurveType = $Values<typeof XYCurveTypes>;
export type IconPosition = $Values<typeof IconPositions>;
export type ValueLabelMode = $Values<typeof ValueLabelModes>;
export type AxisExtentMode = $Values<typeof AxisExtentModes>;
export type FittingFunction = $Values<typeof FittingFunctions>;
export type AvailableReferenceLineIcon = $Values<typeof AvailableReferenceLineIcons>;

export interface AxesSettingsConfig {
  yLeft: boolean;
  yRight: boolean;
}

export interface AxisExtentConfig {
  mode: AxisExtentMode;
  lowerBound?: number;
  upperBound?: number;
}

export interface AxisConfig {
  title?: string;
  hide?: boolean;
  id?: string;
  position?: Position;
  labelColor?: string;
  showOverlappingLabels?: boolean;
  showDuplicates?: boolean;
  labelsOrientation?: number;
  truncate?: number;
  showLabels?: boolean;
  showTitle?: boolean;
  showGridLines?: boolean;
}

export interface YAxisConfig extends AxisConfig {
  mode?: AxisMode;
  boundsMargin?: number;
  extent?: AxisExtentConfigResult;
  scaleType?: YScaleType;
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
  color?: string;
  axisId?: string;
}

export interface DataLayerArgs {
  accessors: string[];
  seriesType: SeriesType;
  xAccessor?: string;
  hide?: boolean;
  splitAccessor?: string;
  columnToLabel?: string; // Actually a JSON key-value pair
  yScaleType: YScaleType;
  xScaleType: XScaleType;
  isHistogram: boolean;
  isPercentage: boolean;
  isStacked: boolean;
  isHorizontal: boolean;
  // palette will always be set on the expression
  palette: PaletteOutput;
  yConfig?: YConfigResult[];
  xAxisId?: string;
}

export interface ValidLayer extends DataLayerConfigResult {
  xAccessor: NonNullable<DataLayerConfigResult['xAccessor']>;
}

export interface ExtendedDataLayerArgs {
  accessors: string[];
  seriesType: SeriesType;
  xAccessor?: string;
  hide?: boolean;
  splitAccessor?: string;
  columnToLabel?: string; // Actually a JSON key-value pair
  yScaleType: YScaleType;
  xScaleType: XScaleType;
  isHistogram: boolean;
  isPercentage: boolean;
  isStacked: boolean;
  isHorizontal: boolean;
  // palette will always be set on the expression
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

// Arguments to XY chart expression, with computed properties
export interface XYArgs {
  legend: LegendConfigResult;
  endValue?: EndValue;
  emphasizeFitting?: boolean;
  valueLabels: ValueLabelMode;
  dataLayers: DataLayerConfigResult[];
  referenceLineLayers: ReferenceLineLayerConfigResult[];
  annotationLayers: AnnotationLayerConfigResult[];
  fittingFunction?: FittingFunction;
  curveType?: XYCurveType;
  fillOpacity?: number;
  hideEndzones?: boolean;
  valuesInLegend?: boolean;
  ariaLabel?: string;
  axes?: YAxisConfigResult[];
  xAxisConfig?: XAxisConfigResult;
}

export interface LayeredXYArgs {
  legend: LegendConfigResult;
  endValue?: EndValue;
  emphasizeFitting?: boolean;
  valueLabels: ValueLabelMode;
  layers?: XYExtendedLayerConfigResult[];
  fittingFunction?: FittingFunction;
  curveType?: XYCurveType;
  fillOpacity?: number;
  hideEndzones?: boolean;
  valuesInLegend?: boolean;
  ariaLabel?: string;
  axes?: YAxisConfigResult[];
  xAxisConfig?: XAxisConfigResult;
}

export interface XYProps {
  legend: LegendConfigResult;
  valueLabels: ValueLabelMode;
  layers: CommonXYLayerConfigResult[];
  endValue?: EndValue;
  emphasizeFitting?: boolean;
  fittingFunction?: FittingFunction;
  curveType?: XYCurveType;
  fillOpacity?: number;
  hideEndzones?: boolean;
  valuesInLegend?: boolean;
  ariaLabel?: string;
  axes?: YAxisConfigResult[];
  xAxisConfig?: XAxisConfigResult;
}

export interface AnnotationLayerArgs {
  annotations: EventAnnotationOutput[];
  hide?: boolean;
}

export interface ExtendedAnnotationLayerArgs {
  annotations: EventAnnotationOutput[];
  hide?: boolean;
  table?: Datatable;
}

export type AnnotationLayerConfigResult = AnnotationLayerArgs & {
  type: typeof ANNOTATION_LAYER;
  layerType: typeof LayerTypes.ANNOTATIONS;
  table: Datatable;
};

export type ExtendedAnnotationLayerConfigResult = ExtendedAnnotationLayerArgs & {
  type: typeof EXTENDED_ANNOTATION_LAYER;
  layerType: typeof LayerTypes.ANNOTATIONS;
  table: Datatable;
};

export interface ReferenceLineLayerArgs {
  accessors: string[];
  columnToLabel?: string;
  yConfig?: ExtendedYConfigResult[];
}

export interface ExtendedReferenceLineLayerArgs {
  accessors: string[];
  columnToLabel?: string;
  yConfig?: ExtendedYConfigResult[];
  table?: Datatable;
}

export type XYLayerArgs = DataLayerArgs | ReferenceLineLayerArgs | AnnotationLayerArgs;

export type XYLayerConfigResult =
  | DataLayerConfigResult
  | ReferenceLineLayerConfigResult
  | AnnotationLayerConfigResult;

export type XYExtendedLayerConfigResult =
  | ExtendedDataLayerConfigResult
  | ExtendedReferenceLineLayerConfigResult
  | ExtendedAnnotationLayerConfigResult;

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
  table: Datatable;
};

export type ExtendedReferenceLineLayerConfigResult = ExtendedReferenceLineLayerArgs & {
  type: typeof EXTENDED_REFERENCE_LINE_LAYER;
  layerType: typeof LayerTypes.REFERENCELINE;
  table: Datatable;
};

export type DataLayerConfigResult = Omit<DataLayerArgs, 'palette'> & {
  type: typeof DATA_LAYER;
  layerType: typeof LayerTypes.DATA;
  palette: PaletteOutput;
  table: Datatable;
};

export type ExtendedDataLayerConfigResult = Omit<ExtendedDataLayerArgs, 'palette'> & {
  type: typeof EXTENDED_DATA_LAYER;
  layerType: typeof LayerTypes.DATA;
  palette: PaletteOutput;
  table: Datatable;
};

export type YConfigResult = YConfig & { type: typeof Y_CONFIG };
export type ExtendedYConfigResult = ExtendedYConfig & { type: typeof EXTENDED_Y_CONFIG };

export type XAxisConfigResult = AxisConfig & { type: typeof X_AXIS_CONFIG };
export type YAxisConfigResult = YAxisConfig & { type: typeof Y_AXIS_CONFIG };

export type LegendConfigResult = LegendConfig & { type: typeof LEGEND_CONFIG };
export type AxisExtentConfigResult = AxisExtentConfig & { type: typeof AXIS_EXTENT_CONFIG };

export type CommonXYLayerConfigResult = XYLayerConfigResult | XYExtendedLayerConfigResult;
export type CommonXYDataLayerConfigResult = DataLayerConfigResult | ExtendedDataLayerConfigResult;
export type CommonXYReferenceLineLayerConfigResult =
  | ReferenceLineLayerConfigResult
  | ExtendedReferenceLineLayerConfigResult;

export type CommonXYAnnotationLayerConfigResult =
  | AnnotationLayerConfigResult
  | ExtendedAnnotationLayerConfigResult;
