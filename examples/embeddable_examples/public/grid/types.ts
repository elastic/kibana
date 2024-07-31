/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface PixelCoordinate {
  x: number;
  y: number;
}

/**
 * A simple pixel rectangle, defined by a top-left origin and a width and height.
 */
export interface PixelRect {
  pixelOrigin: PixelCoordinate;
  pixelWidth: number;
  pixelHeight: number;
}

export interface GridCoordinate {
  column: number;
  row: number;
}

export interface GridRect extends GridCoordinate {
  width: number;
  height: number;
}

export interface GridData extends GridRect {
  id: string;
}

export interface GridRow {
  [key: string]: GridData;
}

export type GridLayout = GridRow[];

export interface GridSettings {
  gutterSize: number;
  rowHeight: number;
  columnCount: number;
}

/**
 * The runtime settings for the grid, including the pixel width of each column
 * which is calculated on the fly based on the grid settings and the width of
 * the containing element.
 */
export type RuntimeGridSettings = GridSettings & { columnPixelWidth: number };

/**
 * The information required to start a panel interaction.
 */
export interface PanelInteractionEvent {
  /**
   * The type of interaction being performed.
   */
  type: 'drag' | 'resize';

  /**
   * The id of the panel being interacted with.
   */
  id: string;

  /**
   * The index of the grid row this panel interaction started in.
   */
  originRowIndex: number;

  /**
   * stores an offset which can be used to translate the mouse position
   *  in the drag event to the origin point of the panel: (top left in a
   * drag operation, bottom right in a resize operation)
   */
  mouseToOriginOffset: PixelCoordinate;
}
