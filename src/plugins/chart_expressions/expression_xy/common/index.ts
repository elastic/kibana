/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'expressionXy';
export const PLUGIN_NAME = 'expressionXy';

export {
  xyVisFunction,
  xAxisConfigFunction,
  yAxisConfigFunction,
  layeredXyVisFunction,
  yConfigFunction,
  extendedYConfigFunction,
  legendConfigFunction,
  dataLayerFunction,
  annotationLayerFunction,
  extendedAnnotationLayerFunction,
  extendedDataLayerFunction,
  axisExtentConfigFunction,
  referenceLineLayerFunction,
  extendedReferenceLineLayerFunction,
} from './expression_functions';

export type {
  XYArgs,
  YConfig,
  EndValue,
  XYRender,
  LayerType,
  LineStyle,
  FillStyle,
  SeriesType,
  YScaleType,
  XScaleType,
  AxisMode,
  AxisConfig,
  YAxisConfig,
  ValidLayer,
  XYLayerArgs,
  XYCurveType,
  XYChartProps,
  LegendConfig,
  IconPosition,
  DataLayerArgs,
  LensMultiTable,
  ValueLabelMode,
  AxisExtentMode,
  FittingFunction,
  ExtendedYConfig,
  AxisExtentConfig,
  CollectiveConfig,
  LegendConfigResult,
  AxesSettingsConfig,
  XAxisConfigResult,
  YAxisConfigResult,
  AnnotationLayerArgs,
  XYLayerConfigResult,
  ExtendedYConfigResult,
  DataLayerConfigResult,
  AxisExtentConfigResult,
  ReferenceLineLayerArgs,
  CommonXYLayerConfigResult,
  AvailableReferenceLineIcon,
  XYExtendedLayerConfigResult,
  AnnotationLayerConfigResult,
  ExtendedAnnotationLayerArgs,
  ExtendedDataLayerConfigResult,
  CommonXYDataLayerConfigResult,
  ReferenceLineLayerConfigResult,
  ExtendedAnnotationLayerConfigResult,
  CommonXYAnnotationLayerConfigResult,
  ExtendedReferenceLineLayerConfigResult,
  CommonXYReferenceLineLayerConfigResult,
} from './types';
