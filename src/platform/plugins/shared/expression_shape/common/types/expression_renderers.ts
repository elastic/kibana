/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Shape, ProgressOutput as Arguments } from './expression_functions';

export type OriginString = 'bottom' | 'left' | 'top' | 'right';
export interface ShapeRendererConfig {
  border: string;
  borderWidth: number;
  shape: Shape;
  fill: string;
  maintainAspect: boolean;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

export interface ParentNodeParams {
  borderOffset: number;
  width: number;
  height: number;
}

export interface ViewBoxParams {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export type ProgressRendererConfig = Arguments;
