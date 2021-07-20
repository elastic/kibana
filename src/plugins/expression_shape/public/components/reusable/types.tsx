/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Ref, SVGProps } from 'react';
import { ViewBoxParams } from '../../../common/types';
import type { ShapeType } from './shape_factory';

export interface ShapeProps {
  shapeAttributes?: ShapeAttributes;
  shapeContentAttributes?: ShapeContentAttributes;
}

export enum SvgElementTypes {
  polygon,
  circle,
  rect,
  path,
}

export interface ShapeAttributes {
  fill?: SVGProps<SVGElement>['fill'];
  stroke?: SVGProps<SVGElement>['stroke'];
  width?: SVGProps<SVGElement>['width'];
  height?: SVGProps<SVGElement>['height'];
  viewBox?: ViewBoxParams;
  overflow?: SVGProps<SVGElement>['overflow'];
  preserveAspectRatio?: SVGProps<SVGElement>['preserveAspectRatio'];
}

export interface ShapeContentAttributes {
  strokeWidth?: SVGProps<SVGElement>['strokeWidth'];
  stroke?: SVGProps<SVGElement>['stroke'];
  fill?: SVGProps<SVGElement>['fill'];
  vectorEffect?: SVGProps<SVGElement>['vectorEffect'];
  strokeMiterlimit?: SVGProps<SVGElement>['strokeMiterlimit'];
}

interface CircleParams {
  r: SVGProps<SVGCircleElement>['r'];
  cx: SVGProps<SVGCircleElement>['cx'];
  cy: SVGProps<SVGCircleElement>['cy'];
}

interface RectParams {
  x: SVGProps<SVGRectElement>['x'];
  y: SVGProps<SVGRectElement>['y'];
  width: SVGProps<SVGRectElement>['width'];
  height: SVGProps<SVGRectElement>['height'];
}

interface PathParams {
  d: SVGProps<SVGPathElement>['d'];
}

interface PolygonParams {
  points?: SVGProps<SVGPolygonElement>['points'];
  strokeLinejoin?: SVGProps<SVGPolygonElement>['strokeLinejoin'];
}

type SpecificShapeContentAttributes = CircleParams | RectParams | PathParams | PolygonParams;

export interface SvgConfig {
  shapeType?: SvgElementTypes;
  viewBox: ViewBoxParams;
  shapeProps: ShapeContentAttributes & SpecificShapeContentAttributes;
}

export type ShapeDrawerProps = {
  shapeType: string;
  getShape: (shapeType: string) => ShapeType | undefined;
  ref: Ref<ShapeRef>;
} & ShapeProps;

export interface ShapeRef {
  getData: () => SvgConfig;
}

export type { ShapeType };
