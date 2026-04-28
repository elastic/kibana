/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Standalone type definitions for the `GridLayout` external package.
 *
 * Types are defined inline (not re-exported) so that declaration generation
 * does not pull in the full Kibana dependency graph. Build-time validation
 * in `type_validation.ts` ensures these stay in sync with the source types.
 *
 * @see {@link ./type_validation.ts} for the compatibility check.
 */

import type * as React from 'react';

/**
 * Controls whether the resize and drag handles are visible and functioning.
 */
export type GridAccessMode = 'VIEW' | 'EDIT';

/**
 * The settings for how the grid should be rendered.
 */
export interface GridSettings {
  gutterSize: number;
  rowHeight: number;
  columnCount: number;
  keyboardDragTopLimit: number;
}

/**
 * Position and size of a panel within the grid.
 */
export interface GridPanelData {
  id: string;
  column: number;
  row: number;
  width: number;
  height: number;
  resizeOptions?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
}

/**
 * A collapsible section grouping panels within the grid.
 */
export interface GridSectionData {
  id: string;
  row: number;
  title: string;
  isCollapsed: boolean;
  panels: { [key: string]: GridPanelData };
}

/**
 * A widget is either a panel or a section at the top level of the layout.
 */
export type GridLayoutWidget =
  | (GridPanelData & { type: 'panel' })
  | (GridSectionData & { type: 'section' });

/**
 * The complete grid layout data structure — a map of widget IDs to widgets.
 */
export interface GridLayoutData {
  [key: string]: GridLayoutWidget;
}

/**
 * Controls the drag handle mode for panels.
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
 * Props accepted by the `GridLayout` component.
 */
export type GridLayoutProps = {
  layout: GridLayoutData;
  gridSettings: GridSettings;
  onLayoutChange: (newLayout: GridLayoutData) => void;
  expandedPanelId?: string;
  accessMode?: GridAccessMode;
  /** Passes custom CSS via Emotion. */
  className?: string;
} & UseCustomDragHandle;

/** Component declaration (compiled to function declaration in `.d.ts`). */
export declare function GridLayout(props: GridLayoutProps): React.ReactNode;
