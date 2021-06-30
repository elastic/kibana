/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IInterpreterRenderHandlers } from '../../../../../src/plugins/expressions';
import { ShapeRendererConfig } from './expression_renderers';

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

export interface ViewBoxParams {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface ShapeProps {
  shapeAttributes: ShapeAttributes;
  shapeContentAttributes: ShapeContentAttributes;
  setViewBoxParams: (viewBoxParams: ViewBoxParams) => void;
}

export interface ParentNodeParams {
  borderOffset: number;
  width: number;
  height: number;
}

export interface ShapeComponentProps extends ShapeRendererConfig {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
}
