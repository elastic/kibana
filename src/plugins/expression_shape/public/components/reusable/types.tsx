/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Component, CSSProperties, Ref, SVGProps } from 'react';
import { ViewBoxParams } from '../../../common/types';
import type { ShapeType } from './shape_factory';

export type ShapeProps = {
  shapeAttributes?: ShapeAttributes;
  shapeContentAttributes?: ShapeContentAttributes &
    SpecificShapeContentAttributes & { ref?: React.RefObject<any> };
  textAttributes?: SvgTextAttributes;
} & Component['props'] & { ref?: React.RefObject<any> };

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
export interface SvgConfig {
  shapeType?: SvgElementTypes;
  viewBox: ViewBoxParams;
  shapeProps: ShapeContentAttributes &
    SpecificShapeContentAttributes &
    Component['props'] & { ref?: React.RefObject<any> };
  textAttributes?: SvgTextAttributes;
}

export type SvgTextAttributes = Partial<Element> & {
  x?: SVGProps<SVGTextElement>['x'];
  y?: SVGProps<SVGTextElement>['y'];
  textAnchor?: SVGProps<SVGTextElement>['textAnchor'];
  dominantBaseline?: SVGProps<SVGTextElement>['dominantBaseline'];
  dx?: SVGProps<SVGTextElement>['dx'];
  dy?: SVGProps<SVGTextElement>['dy'];
} & { style?: CSSProperties } & { ref?: React.RefObject<SVGTextElement> };

export interface CircleParams {
  r: SVGProps<SVGCircleElement>['r'];
  cx: SVGProps<SVGCircleElement>['cx'];
  cy: SVGProps<SVGCircleElement>['cy'];
}

export interface RectParams {
  x: SVGProps<SVGRectElement>['x'];
  y: SVGProps<SVGRectElement>['y'];
  width: SVGProps<SVGRectElement>['width'];
  height: SVGProps<SVGRectElement>['height'];
}

export interface PathParams {
  d: SVGProps<SVGPathElement>['d'];
  strokeLinecap?: SVGProps<SVGPathElement>['strokeLinecap'];
}

export interface PolygonParams {
  points?: SVGProps<SVGPolygonElement>['points'];
  strokeLinejoin?: SVGProps<SVGPolygonElement>['strokeLinejoin'];
}

export type SpecificShapeContentAttributes = CircleParams | RectParams | PathParams | PolygonParams;

export type ShapeDrawerProps = {
  shapeType: string;
  getShape: (shapeType: string) => ShapeType | undefined;
  ref: Ref<ShapeRef>;
} & ShapeProps;

export interface ShapeRef {
  getData: () => SvgConfig;
}

export type ShapeDrawerComponentProps = Omit<ShapeDrawerProps, 'getShape'>;

export type { ShapeType };
