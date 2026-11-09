/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface FlexPanelData {
  order: number;
  grow: boolean;
  width: number;
  id: string;
  resizeOptions?: {
    minWidth?: number;
    maxWidth?: number;
  };
}

export interface ActivePanelEvent {
  /**
   * The type of interaction being performed.
   */
  type: 'drag' | 'resize';

  /**
   * The id of the panel being interacted with.
   */
  id: string;

  /**
   * The pixel rect of the panel being interacted with.
   */
  panelDiv: HTMLDivElement;

  /**
   * The pixel offsets from where the mouse was at drag start to the
   * edges of the panel
   */
  sensorOffsets: {
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
  sensorType: 'mouse' | 'touch' | 'keyboard';

  /**
   * The rendered width of every panel when a resize event starts
   */
  panelWidths?: Record<string, number>;

  /**
   * This position of the fixed position panel
   */
  position: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
}
