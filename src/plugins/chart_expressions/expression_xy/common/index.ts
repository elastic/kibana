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
  layeredXyVisFunction,
  yAxisConfigFunction,
  legendConfigFunction,
  gridlinesConfigFunction,
  dataLayerFunction,
  extendedDataLayerFunction,
  axisExtentConfigFunction,
  tickLabelsConfigFunction,
  labelsOrientationConfigFunction,
  referenceLineLayerFunction,
  extendedReferenceLineLayerFunction,
  axisTitlesVisibilityConfigFunction,
} from './expression_functions';

export type {
  XYArgs,
  YConfig,
  EndValue,
  XYRender,
  LayerType,
  YAxisMode,
  LineStyle,
  FillStyle,
  SeriesType,
  YScaleType,
  XScaleType,
  AxisConfig,
  XYCurveType,
  XYChartProps,
  LegendConfig,
  IconPosition,
  YConfigResult,
  DataLayerArgs,
  LensMultiTable,
  ValueLabelMode,
  AxisExtentMode,
  FittingFunction,
  AxisExtentConfig,
  XYDataLayerConfig,
  LegendConfigResult,
  AxesSettingsConfig,
  XYLayerConfigResult,
  GridlinesConfigResult,
  DataLayerConfigResult,
  TickLabelsConfigResult,
  AxisExtentConfigResult,
  ReferenceLineLayerArgs,
  LabelsOrientationConfig,
  CommonXYLayerConfigResult,
  XYReferenceLineLayerConfig,
  XYExtendedLayerConfigResult,
  LabelsOrientationConfigResult,
  CommonXYDataLayerConfigResult,
  ReferenceLineLayerConfigResult,
  AxisTitlesVisibilityConfigResult,
  CommonXYReferenceLineLayerConfigResult,
} from './types';
