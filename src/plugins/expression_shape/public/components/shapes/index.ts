/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Shape } from '../../../common/types';
import { ShapeType } from '../../../../../../src/plugins/presentation_util/public';

const shapes: { [key in Shape]: () => Promise<{ default: ShapeType }> } = {
  arrow: () => import('./arrow'),
  arrowMulti: () => import('./arrow_multi'),
  bookmark: () => import('./bookmark'),
  cross: () => import('./cross'),
  circle: () => import('./circle'),
  hexagon: () => import('./hexagon'),
  kite: () => import('./kite'),
  pentagon: () => import('./pentagon'),
  rhombus: () => import('./rhombus'),
  semicircle: () => import('./semicircle'),
  speechBubble: () => import('./speech_bubble'),
  square: () => import('./square'),
  star: () => import('./star'),
  tag: () => import('./tag'),
  triangle: () => import('./triangle'),
  triangleRight: () => import('./triangle_right'),
};

export const getShape = (shapeType: keyof typeof shapes | null) => shapes[shapeType];
