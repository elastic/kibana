/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { GaugeColorMode, GaugeExpressionState } from '@kbn/visualizations-plugin/common';
import type { PaletteOutput } from '@kbn/coloring';
import type {
  Datatable,
  DefaultInspectorAdapters,
  ExecutionContext,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '@kbn/expressions-plugin/common';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { MakeOverridesSerializable, Simplify } from '@kbn/chart-expressions-common/types';
import type { GoalProps } from '@elastic/charts';
import { EXPRESSION_GAUGE_NAME, GAUGE_FUNCTION_RENDERER_NAME } from '../constants';

export type GaugeState = GaugeExpressionState;

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
