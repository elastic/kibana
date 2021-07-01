/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IInterpreterRenderHandlers } from '../../../../../src/plugins/expressions';
import { ShapeRendererConfig, ViewBoxParams } from '../../common/types';

export interface ShapeAttributes {
  width?: number;
  height?: number;
  viewBox?: ViewBoxParams;
  overflow?: string;
  preserveAspectRatio?: string;
}

export interface ShapeContentAttributes {
  strokeWidth?: string;
  stroke?: string;
  fill?: string;
  vectorEffect?: string;
  strokeMiterlimit?: string;
}

export interface ShapeHocProps {
  shapeAttributes: ShapeAttributes;
  shapeContentAttributes: ShapeContentAttributes;
  setViewBoxParams: (viewBoxParams?: ViewBoxParams) => void;
}

export interface ShapeProps {
  shapeAttributes: ShapeAttributes & {
    viewBox: string;
  };
  shapeContentAttributes: ShapeContentAttributes & {
    points: string;
  };
  shapeType: SvgElementTypes;
}

export enum SvgElementTypes {
  polygon,
  circle,
  rect,
  path,
}

export interface ShapeAttributes {
  width?: number;
  height?: number;
  viewBox?: ViewBoxParams;
  overflow?: string;
  preserveAspectRatio?: string;
}

export interface ShapeContentAttributes {
  strokeWidth?: string;
  stroke?: string;
  fill?: string;
  vectorEffect?: string;
  strokeMiterlimit?: string;
}

export interface ShapeComponentProps extends ShapeRendererConfig {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
}

export interface Dimensions {
  width: number;
  height: number;
}
interface CircleParams {
  r: string;
  cx: string;
  cy: string;
}

interface RectParams {
  x: string;
  y: string;
  width: string;
  height: string;
}

interface PathParams {
  d: string;
}

interface PolygonParams {
  points: string;
  strokeLinejoin?: string;
}

export interface SvgConfig {
  shapeType?: SvgElementTypes;
  viewBox: ViewBoxParams;
  shapeProps: CircleParams | RectParams | PathParams | PolygonParams;
}
