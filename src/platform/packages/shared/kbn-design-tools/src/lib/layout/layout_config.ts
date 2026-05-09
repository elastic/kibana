/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type LayoutType = 'columns' | 'rows' | 'grid';
export type LayoutAlignType = 'stretch' | 'center' | 'left' | 'right';
export type LayoutRowAlignType = 'stretch' | 'center' | 'top' | 'bottom';

export interface LayoutConfig {
  layoutType: LayoutType;
  count: number;
  alignType: LayoutAlignType;
  rowAlignType: LayoutRowAlignType;
  cellSize: number;
  width: number;
  height: number;
  gutterSize: number;
  marginSize: number;
  color: string;
}

export const getDefaultLayoutConfig = (baseSize: number): LayoutConfig => ({
  layoutType: 'columns',
  count: 12,
  alignType: 'stretch',
  rowAlignType: 'stretch',
  cellSize: baseSize,
  width: 0,
  height: 0,
  gutterSize: baseSize,
  marginSize: baseSize,
  color: '#FF00FF1A',
});
