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
import type { ScrollContainer } from '@kbn/core-chrome-layout-utils';
import type { ActivePanelEvent, GridPanelData } from './grid_panel';
import type {
  ActiveSectionEvent,
  CollapsibleSection,
  GridSectionData,
  MainSection,
} from './grid_section';

/**
 * The settings for how the grid should be rendered
 */
export interface GridSettings {
  gutterSize: number;
  rowHeight: number;
  columnCount: number;
  keyboardDragTopLimit: number;
  /**
   * When true, panels stay where they are dropped instead of floating up to close empty space
   * above them. Collisions are still resolved. Defaults to false.
   */
  allowGaps?: boolean;
  /**
   * When set, holding Shift while dragging or resizing with the mouse moves panel edges in steps of
   * this many columns and rows instead of one.
   */
  shiftSnapSize?: number;
  /** Whether a panel shows its size in columns and rows while it is resized. Defaults to true. */
  showResizeGauge?: boolean;
  /** How many columns and rows make up one unit in the resize gauge. Defaults to 1. */
  resizeGaugeScale?: number;
  /**
   * When true, the panel being dragged or resized jumps between the cells it will land on instead
   * of following the pointer. Defaults to false.
   */
  lockActivePanelToGrid?: boolean;
}

/** The grid settings that change how a layout is resolved. */
export type ResolveLayoutOptions = Pick<GridSettings, 'allowGaps'>;

/**
 * The runtime settings for the grid, including the pixel width of each column
 * which is calculated on the fly based on the grid settings and the width of
 * the containing element.
 */
export type RuntimeGridSettings = GridSettings & { columnPixelWidth: number };

/**
 * A grid layout can be a mix of panels and sections, and we call these "widgets" as a general term
 */
export type GridLayoutWidget =
  | (GridPanelData & { type: 'panel' })
  | (GridSectionData & { type: 'section' });

export interface GridLayoutData {
  [key: string]: GridLayoutWidget;
}

/**
 * This represents `GridLayoutData` where every panel exists in an ordered section;
 * i.e. panels and sections are no longer mixed on the same level
 */
export interface OrderedLayout {
  [key: string]: MainSection | CollapsibleSection;
}

/**
 * The GridLayoutStateManager is used for all state management
 */
export interface GridLayoutStateManager {
  gridLayout$: BehaviorSubject<OrderedLayout>;
  expandedPanelId$: BehaviorSubject<string | undefined>;
  isMobileView$: BehaviorSubject<boolean>;
  accessMode$: BehaviorSubject<GridAccessMode>;
  gridDimensions$: BehaviorSubject<ObservedSize>;
  runtimeSettings$: BehaviorSubject<RuntimeGridSettings>;
  scrollContainer$: BehaviorSubject<ScrollContainer>;

  activePanelEvent$: BehaviorSubject<ActivePanelEvent | undefined>;
  activeSectionEvent$: BehaviorSubject<ActiveSectionEvent | undefined>;
  layoutUpdated$: Observable<GridLayoutData>;

  layoutRef: React.MutableRefObject<HTMLDivElement | null>;
  sectionRefs: React.MutableRefObject<{ [sectionId: string]: HTMLDivElement | null }>;
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
