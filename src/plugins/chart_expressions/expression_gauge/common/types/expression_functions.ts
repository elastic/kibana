/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import type { PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '@kbn/expressions-plugin';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/public';
import { CustomPaletteState } from '@kbn/charts-plugin/common';
import {
  EXPRESSION_GAUGE_NAME,
  GAUGE_FUNCTION_RENDERER_NAME,
  GaugeShapes,
  GaugeTicksPositions,
  GaugeLabelMajorModes,
  GaugeColorModes,
  GaugeCentralMajorModes,
} from '../constants';

export type GaugeColorMode = $Values<typeof GaugeColorModes>;
export type GaugeShape = $Values<typeof GaugeShapes>;
export type GaugeLabelMajorMode = $Values<typeof GaugeLabelMajorModes>;
export type GaugeCentralMajorMode = $Values<typeof GaugeCentralMajorModes>;
export type GaugeTicksPosition = $Values<typeof GaugeTicksPositions>;

export interface GaugeState {
  metric?: string | ExpressionValueVisDimension;
  min?: string | ExpressionValueVisDimension;
  max?: string | ExpressionValueVisDimension;
  goal?: string | ExpressionValueVisDimension;
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

export type GaugeArguments = GaugeState & {
  shape: GaugeShape;
  colorMode: GaugeColorMode;
  palette?: PaletteOutput<CustomPaletteState>;
  ariaLabel?: string;
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

export interface Accessors {
  min?: string;
  max?: string;
  metric?: string;
  goal?: string;
}
