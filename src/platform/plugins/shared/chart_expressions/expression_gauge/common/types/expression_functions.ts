/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { $Values } from '@kbn/utility-types';
import type { PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import {
  Datatable,
  DefaultInspectorAdapters,
  ExecutionContext,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { MakeOverridesSerializable, Simplify } from '@kbn/chart-expressions-common/types';
import type { GoalProps } from '@elastic/charts';
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
  colorMode?: GaugeColorMode;
  palette?: PaletteOutput<CustomPaletteParams>;
  shape: GaugeShape;
  respectRanges?: boolean;
  commonLabel?: string;
  /**
   * @deprecated Use `labelMajorMode` instead
   */
  centralMajorMode?: GaugeCentralMajorMode;
  /**
   * @deprecated Use `labelMajor` instead
   */
  centralMajor?: string;
  /**
   * This field is deprecated and will be removed in a future release
   * @deprecated
   */
  percentageMode?: boolean;
}

export type GaugeArguments = GaugeState & {
  colorMode: GaugeColorMode;
  palette?: PaletteOutput<CustomPaletteState>;
  ariaLabel?: string;
};

export type GaugeInput = Datatable;

export interface GaugeExpressionProps {
  data: Datatable;
  args: GaugeArguments;
  canNavigateToLens: boolean;
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
  ExpressionValueRender<GaugeExpressionProps>,
  ExecutionContext<DefaultInspectorAdapters>
>;

export interface Accessors {
  min?: string;
  max?: string;
  metric?: string;
  goal?: string;
}

export type AllowedGaugeOverrides = Partial<
  Record<'gauge', Simplify<MakeOverridesSerializable<GoalProps>>>
>;
