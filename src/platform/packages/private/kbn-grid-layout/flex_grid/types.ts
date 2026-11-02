/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject, Observable } from 'rxjs';
import type { ObservedSize } from 'use-resize-observer/polyfilled';
import type { ActivePanelEvent } from '../grid/grid_panel';

/**
 * The settings for how the grid should be rendered
 */
export interface GridSettings {
  gutterSize: number;
  rowHeight: number;
  columnCount: number;
  keyboardDragTopLimit: number;
}

/**
 * The runtime settings for the grid, including the pixel width of each column
 * which is calculated on the fly based on the grid settings and the width of
 * the containing element.
 */
export type RuntimeGridSettings = GridSettings & { columnPixelWidth: number };

export type FlexGridLayoutPanel = {
  order: number;
  width: number;
  height: number;
  id: string;
  resizeOptions?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
};

export interface FlexGridLayoutData {
  [key: string]: FlexGridLayoutPanel;
}

/**
 * The GridLayoutStateManager is used for all state management
 */
export interface GridLayoutStateManager {
  gridLayout$: BehaviorSubject<FlexGridLayoutData>;
  accessMode$: BehaviorSubject<GridAccessMode>;
  gridDimensions$: BehaviorSubject<ObservedSize>;
  runtimeSettings$: BehaviorSubject<RuntimeGridSettings>;

  activePanelEvent$: BehaviorSubject<ActivePanelEvent | undefined>;
  layoutUpdated$: Observable<FlexGridLayoutData>;

  layoutRef: React.MutableRefObject<HTMLDivElement | null>;
  headerRefs: React.MutableRefObject<{ [sectionId: string]: HTMLDivElement | null }>;
  panelRefs: React.MutableRefObject<{ [panelId: string]: HTMLDivElement | null }>;
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
