/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PaletteContinuity } from '@kbn/coloring';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';

export interface PaletteOutput<T = { [key: string]: unknown }> {
  type: 'palette' | 'system_palette';
  name: string;
  params?: T;
}

export interface CustomPaletteArguments {
  color?: string[];
  gradient: boolean;
  reverse?: boolean;
  stop?: number[];
  range?: 'number' | 'percent';
  rangeMin?: number;
  rangeMax?: number;
  continuity?: PaletteContinuity;
}

export interface CustomPaletteState {
  colors: string[];
  gradient: boolean;
  stops: number[];
  range: 'number' | 'percent';
  rangeMin: number;
  rangeMax: number;
  continuity?: PaletteContinuity;
}

export type PaletteExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'palette',
  null,
  CustomPaletteArguments,
  Promise<PaletteOutput<CustomPaletteState>>
>;
