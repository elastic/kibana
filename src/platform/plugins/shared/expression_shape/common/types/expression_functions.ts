/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ExpressionFunctionDefinition,
  ExpressionValueRender,
  Style,
} from '@kbn/expressions-plugin/common';

export enum Shape {
  ARROW = 'arrow',
  ARROW_MULTI = 'arrowMulti',
  BOOKMARK = 'bookmark',
  CIRCLE = 'circle',
  CROSS = 'cross',
  HEXAGON = 'hexagon',
  KITE = 'kite',
  PENTAGON = 'pentagon',
  RHOMBUS = 'rhombus',
  SEMICIRCLE = 'semicircle',
  SPEECH_BUBBLE = 'speechBubble',
  SQUARE = 'square',
  STAR = 'star',
  TAG = 'tag',
  TRIANGLE = 'triangle',
  TRIANGLE_RIGHT = 'triangleRight',
}

interface Arguments {
  border: string;
  borderWidth: number;
  shape: Shape;
  fill: string;
  maintainAspect: boolean;
}

export interface Output extends Arguments {
  type: 'shape';
}

export type ExpressionShapeFunction = () => ExpressionFunctionDefinition<
  'shape',
  number | null,
  Arguments,
  Output
>;

export enum Progress {
  GAUGE = 'gauge',
  HORIZONTAL_BAR = 'horizontalBar',
  HORIZONTAL_PILL = 'horizontalPill',
  SEMICIRCLE = 'semicircle',
  UNICORN = 'unicorn',
  VERTICAL_BAR = 'verticalBar',
  VERTICAL_PILL = 'verticalPill',
  WHEEL = 'wheel',
}

export interface ProgressArguments {
  barColor: string;
  barWeight: number;
  font: Style;
  label: boolean | string;
  max: number;
  shape: Progress;
  valueColor: string;
  valueWeight: number;
}

export type ProgressOutput = ProgressArguments & {
  value: number;
};

export type ExpressionProgressFunction = () => ExpressionFunctionDefinition<
  'progress',
  number,
  ProgressArguments,
  ExpressionValueRender<ProgressArguments>
>;
