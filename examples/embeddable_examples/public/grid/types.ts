/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type GridLayout = GridRow[];

export interface PixelCoordinate {
  x: number;
  y: number;
}

export interface GridCoordinate {
  column: number;
  row: number;
}

export interface GridRow {
  [key: string]: GridData;
}

export interface GridData extends GridCoordinate {
  id: string;
  width: number;
  height: number;
}

export type RuntimeGridSettings = GridSettings & { columnPixelWidth: number };

export interface InteractionData {
  type: 'drag' | 'resize';
  panelData: GridData;
  targetedRow: number;
}

export interface GridSettings {
  gutterSize: number;
  rowHeight: number;
  columnCount: number;
}
