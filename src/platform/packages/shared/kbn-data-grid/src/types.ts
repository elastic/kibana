/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode, Ref } from 'react';
import type { EuiDataGridColumnCellAction } from '@elastic/eui';
import type { Interpolation, Theme } from '@emotion/react';

export interface DataGridCellRenderProps<TRow> {
  row: TRow;
  /** Index of the row in the `rows` passed to the grid, whatever the pinned or virtualized position. */
  rowIndex: number;
  columnId: string;
  /** True when the cell is rendered in the expansion popover instead of in the grid. */
  isDetails: boolean;
}

/** Props applied to a cell or a row element, e.g. to color it based on its value. */
export interface DataGridElementProps {
  css?: Interpolation<Theme>;
  className?: string;
  'data-test-subj'?: string;
}

export interface DataGridColumn<TRow> {
  id: string;
  header: ReactNode;
  renderCell: (props: DataGridCellRenderProps<TRow>) => ReactNode;
  /**
   * Width in pixels, or a function of the grid width, used until the user resizes the column.
   * Columns without an initial width share the remaining space.
   */
  initialWidth?: number | ((gridWidth: number) => number);
  minWidth?: number;
  maxWidth?: number;
  /** Whether the user can resize the column by dragging its header edge. Requires an `initialWidth`. */
  isResizable?: boolean;
  /** Actions shown in the cell actions bubble on hover or focus, and in the expansion popover. */
  cellActions?: EuiDataGridColumnCellAction[];
  /** Extra content rendered at the bottom of the expansion popover, e.g. a warning. */
  renderCellExpansionFooter?: (row: TRow) => ReactNode;
  /** Styles for every cell of the column, applied after the default cell styles. */
  cellCss?: Interpolation<Theme>;
}

/**
 * A column before or after the data columns that renders its own interactive content (e.g. a pin
 * button). It has a fixed width, no cell actions and no expansion popover.
 */
export interface DataGridControlColumn<TRow> {
  id: string;
  header: ReactNode;
  width: number;
  renderCell: (props: Pick<DataGridCellRenderProps<TRow>, 'row' | 'rowIndex'>) => ReactNode;
  cellCss?: Interpolation<Theme>;
}

export interface DataGridCellKey {
  rowId: string;
  columnId: string;
}

/** The one cell whose expansion popover is open, owned by the grid so opening another closes it. */
export interface DataGridExpandedCell extends DataGridCellKey {
  /** Viewport rect of what opened the popover, e.g. the expand icon. */
  anchorRect: DOMRect;
}

/** The columns as the grid renders them, control columns included. */
export interface DataGridInternalColumn<TRow> extends DataGridColumn<TRow> {
  isControl: boolean;
}

export interface DataGridRef {
  /** Scrolls the row into view if it is part of the virtualized (not pinned) rows. */
  scrollToRow: (rowId: string) => void;
}

export interface DataGridProps<TRow> {
  rows: TRow[];
  /** Memoize it, a new array rebuilds the column model. */
  columns: Array<DataGridColumn<TRow>>;
  leadingControlColumns?: Array<DataGridControlColumn<TRow>>;
  trailingControlColumns?: Array<DataGridControlColumn<TRow>>;
  getRowId: (row: TRow) => string;
  /** Accessible name of the grid. */
  ariaLabel: string;
  'data-test-subj'?: string;
  /**
   * Props for a single cell, e.g. a background color. Keep it stable (`useCallback`), a new
   * function re-renders every visible cell.
   */
  getCellProps?: (
    params: Pick<DataGridCellRenderProps<TRow>, 'row' | 'rowIndex' | 'columnId'>
  ) => DataGridElementProps | undefined;
  /** Props for a row, e.g. to highlight it. Keep it stable (`useCallback`). */
  getRowProps?: (params: { row: TRow; rowIndex: number }) => DataGridElementProps | undefined;
  /** Rows with these ids stay in a sticky section below the header. Their order follows `rows`. */
  pinnedRowIds?: string[];
  /** Whether to render the column header row. Defaults to `true`. */
  showHeader?: boolean;
  /** Used to size the scrollbar before rows are measured. Rows grow to fit their content. */
  estimatedRowHeight?: number;
  /**
   * Column widths in pixels, by column id. When set, the grid is controlled: a resize is only
   * applied if `columnWidths` is updated in `onColumnResize`. When omitted, the grid keeps the widths.
   */
  columnWidths?: Record<string, number>;
  /**
   * Called when the user finishes resizing a column, or resets it by double clicking. `width` is
   * `undefined` on reset: drop the column from `columnWidths` so it uses its `initialWidth` again.
   */
  onColumnResize?: (params: { columnId: string; width: number | undefined }) => void;
  initialScrollOffset?: number;
  onScrollOffsetChange?: (scrollOffset: number) => void;
  gridRef?: Ref<DataGridRef>;
}
