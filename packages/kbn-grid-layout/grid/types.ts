/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { ObservedSize } from 'use-resize-observer/polyfilled';

import { SerializableRecord } from '@kbn/utility-types';

/**
 * The external API provided through the GridLayout component
 */
export interface GridLayoutApi {
  addPanel: (id: string, placementSettings: PanelPlacementSettings) => void;
  removePanel: (panelId: string) => void;
  replacePanel: (oldPanelId: string, newPanelId: string) => void;

  getPanelCount: () => number;
  serializeState: () => GridLayoutData & SerializableRecord;
}

export interface GridCoordinate {
  column: number;
  row: number;
}
export interface GridRect extends GridCoordinate {
  width: number;
  height: number;
}

export interface GridPanelData extends GridRect {
  id: string;
}

export interface GridRowData {
  title: string;
  isCollapsed: boolean;
  panels: {
    [key: string]: GridPanelData;
  };
}

export type GridLayoutData = GridRowData[];

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

export interface ActivePanel {
  id: string;
  position: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
}

export interface GridLayoutStateManager {
  gridLayout$: BehaviorSubject<GridLayoutData>;

  gridDimensions$: BehaviorSubject<ObservedSize>;
  runtimeSettings$: BehaviorSubject<RuntimeGridSettings>;
  activePanel$: BehaviorSubject<ActivePanel | undefined>;
  interactionEvent$: BehaviorSubject<PanelInteractionEvent | undefined>;

  layoutUpdateEvent$: BehaviorSubject<GridLayoutData>;

  rowRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  panelRefs: React.MutableRefObject<Array<{ [id: string]: HTMLDivElement | null }>>;
}

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
   * The index of the grid row this panel interaction is targeting.
   */
  targetRowIndex: number;

  /**
   * The pixel rect of the panel being interacted with.
   */
  panelDiv: HTMLDivElement;

  /**
   * The pixel offsets from where the mouse was at drag start to the
   * edges of the panel
   */
  mouseOffsets: {
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
}

// TODO: Remove from Dashboard app
export enum PanelPlacementStrategy {
  /** Place on the very top of the Dashboard, add the height of this panel to all other panels. */
  placeAtTop = 'placeAtTop',
  /** Look for the smallest y and x value where the default panel will fit. */
  findTopLeftMostOpenSpace = 'findTopLeftMostOpenSpace',
}

export interface PanelPlacementSettings {
  strategy?: PanelPlacementStrategy;
  height: number;
  width: number;
}
