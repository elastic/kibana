/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ExpressionFunctionDefinition, ExpressionValueRender } from 'src/plugins/expressions';

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
