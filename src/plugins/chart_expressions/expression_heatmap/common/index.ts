/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'expressionHeatmap';
export const PLUGIN_NAME = 'expressionHeatmap';

export type {
  HeatmapExpressionProps,
  FilterEvent,
  BrushEvent,
  FormatFactory,
  HeatmapRenderProps,
  CustomPaletteParams,
  ColorStop,
  RequiredPaletteParamTypes,
  HeatmapLegendConfigResult,
  HeatmapGridConfigResult,
  HeatmapArguments,
} from './types';

export { heatmapFunction, heatmapLegendConfig, heatmapGridConfig } from './expression_functions';

export { EXPRESSION_HEATMAP_NAME } from './constants';
