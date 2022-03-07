/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'expressionGauge';
export const PLUGIN_NAME = 'expressionGauge';

export type {
  GaugeExpressionFunctionDefinition,
  GaugeExpressionProps,
  FormatFactory,
  GaugeRenderProps,
  CustomPaletteParams,
  ColorStop,
  RequiredPaletteParamTypes,
  GaugeArguments,
  GaugeShape,
  GaugeLabelMajorMode,
  GaugeTicksPosition,
  GaugeState,
  Accessors,
} from './types';

export { gaugeFunction } from './expression_functions';

export {
  EXPRESSION_GAUGE_NAME,
  GaugeShapes,
  GaugeColorModes,
  GaugeTicksPositions,
  GaugeLabelMajorModes,
} from './constants';
