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
  proposedGridLayout$: BehaviorSubject<GridLayoutData | undefined>; // temporary state for layout during drag and drop operations
  expandedPanelId$: BehaviorSubject<string | undefined>;
  isMobileView$: BehaviorSubject<boolean>;
  accessMode$: BehaviorSubject<GridAccessMode>;
  gridDimensions$: BehaviorSubject<ObservedSize>;
  runtimeSettings$: BehaviorSubject<RuntimeGridSettings>;
  activePanel$: BehaviorSubject<ActivePanel | undefined>;
  interactionEvent$: BehaviorSubject<PanelInteractionEvent | undefined>;

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
  pointerOffsets: {
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
}

/**
 * This type is used to conditionally change the type of `renderPanelContents` depending
 * on the value of `useCustomDragHandle`
 */
export type UseCustomDragHandle =
  | {
      useCustomDragHandle: true;
      renderPanelContents: (
        panelId: string,
        setDragHandles: (refs: Array<HTMLElement | null>) => void
      ) => React.ReactNode;
    }
  | {
      useCustomDragHandle?: false;
      renderPanelContents: (panelId: string) => React.ReactNode;
    };

/**
 * Controls whether the resize + drag handles are visible and functioning
 */
export type GridAccessMode = 'VIEW' | 'EDIT';
