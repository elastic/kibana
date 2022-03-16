/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionShapePlugin } from './plugin';

export type { ExpressionShapePluginSetup, ExpressionShapePluginStart } from './plugin';

export function plugin() {
  return new ExpressionShapePlugin();
}

export {
  getShapeRenderer,
  shapeRendererFactory,
  getProgressRenderer,
  progressRendererFactory,
} from './expression_renderers';

export { LazyShapeDrawer } from './components/shape';
export { LazyProgressDrawer } from './components/progress';
export { getDefaultShapeData } from './components/reusable';

export type {
  ShapeProps,
  ShapeAttributes,
  ShapeContentAttributes,
  SvgConfig,
  SvgTextAttributes,
  CircleParams,
  RectParams,
  PathParams,
  PolygonParams,
  SpecificShapeContentAttributes,
  ShapeDrawerProps,
  ShapeDrawerComponentProps,
  ShapeRef,
  ShapeType,
} from './components/reusable/types';

export { SvgElementTypes } from './components/reusable/types';

export type {
  Output,
  ExpressionShapeFunction,
  ProgressArguments,
  ProgressOutput,
  ExpressionProgressFunction,
  OriginString,
  ShapeRendererConfig,
  NodeDimensions,
  ParentNodeParams,
  ViewBoxParams,
  ProgressRendererConfig,
} from '../common/types';

export { Progress, Shape } from '../common/types';

export type { ShapeComponentProps, Dimensions } from './components/shape/types';
