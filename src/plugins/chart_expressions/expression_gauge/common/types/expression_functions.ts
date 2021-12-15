/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '../../../../expressions';
import { CustomPaletteState, PaletteOutput } from '../../../../charts/common';
import {
  EXPRESSION_GAUGE_NAME,
  GAUGE_FUNCTION_RENDERER_NAME,
  GaugeShapes,
  GaugeTicksPositions,
  GaugeLabelMajorModes,
  GaugeColorModes,
} from '../constants';
import { CustomPaletteParams } from '.';

export type GaugeType = 'gauge';
export type GaugeColorMode = keyof typeof GaugeColorModes;
export type GaugeShape = keyof typeof GaugeShapes;
export type GaugeLabelMajorMode = keyof typeof GaugeLabelMajorModes;
export type GaugeTicksPosition = keyof typeof GaugeTicksPositions;

export interface GaugeState {
  metricAccessor?: string;
  minAccessor?: string;
  maxAccessor?: string;
  goalAccessor?: string;
  ticksPosition: GaugeTicksPosition;
  labelMajorMode: GaugeLabelMajorMode;
  labelMajor?: string;
  labelMinor?: string;
  colorMode?: GaugeColorMode;
  palette?: PaletteOutput<CustomPaletteParams>;
  shape: GaugeShape;
}

export type GaugeArguments = GaugeState & {
  shape: GaugeShape;
  colorMode: GaugeColorMode;
  palette?: PaletteOutput<CustomPaletteState>;
};

export type GaugeInput = Datatable;

export interface GaugeExpressionProps {
  data: Datatable;
  args: GaugeArguments;
}

export interface GaugeRender {
  type: 'render';
  as: typeof GAUGE_FUNCTION_RENDERER_NAME;
  value: GaugeExpressionProps;
}

export type GaugeExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_GAUGE_NAME,
  GaugeInput,
  GaugeArguments,
  ExpressionValueRender<GaugeExpressionProps>
>;
