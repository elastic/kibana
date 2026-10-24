/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ComponentType,
  CSSProperties,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
  Ref,
} from 'react';
import type { EuiDataGridColumnCellAction } from '@elastic/eui';
import type { Interpolation, Theme } from '@emotion/react';

/** Attributes of a cell element that its content decides on, e.g. a color based on its value. */
export interface DataGridSetCellProps {
  className?: string;
  style?: CSSProperties;
  'data-test-subj'?: string;
}

export interface DataGridCellRenderProps<TRow> {
  row: TRow;
  /** Index of the row in the `rows` passed to the grid, whatever the pinned or virtualized position. */
  rowIndex: number;
  columnId: string;
  /** Position of the column among all the columns of the grid, starting at 0. */
  colIndex: number;
  /** True when the cell is rendered in the expansion popover instead of in the grid. */
  isDetails: boolean;
  /**
   * Sets attributes of the cell element, replacing the ones set before. Call it from an effect, not
   * while rendering. Does nothing in the expansion popover.
   */
  setCellProps: (props: DataGridSetCellProps) => void;
  /** Whether the cell can be expanded into a popover. */
  isExpandable: boolean;
  /** Whether the popover of the cell is open. */
  isExpanded: boolean;
}

/** Props to change the popover of an expanded cell. */
export interface DataGridPopoverProps {
  panelClassName?: string;
  panelProps?: HTMLAttributes<HTMLDivElement> & { css?: Interpolation<Theme> };
}

export interface DataGridCellPopoverProps<TRow> {
  row: TRow;
  rowIndex: number;
  columnId: string;
  colIndex: number;
  /** The value of the cell, rendered like in the grid but with `isDetails`. */
  children: ReactNode;
  /** The element with the content of the cell in the grid. */
  cellContentElement: HTMLElement | null;
  /** The footer of the popover: the cell actions and the `renderCellExpansionFooter` of the column. */
  cellActions: ReactNode;
  closePopover: () => void;
  setPopoverProps: (props: DataGridPopoverProps) => void;
  /** Renders the default content of the popover, for a custom one to build on. */
  DefaultPopoverContent: ComponentType;
}

/** Props applied to a cell or a row element, e.g. to color it based on its value. */
export interface DataGridElementProps {
  css?: Interpolation<Theme>;
  className?: string;
  'data-test-subj'?: string;
  /** More `data-` attributes, e.g. the index of the row for code that looks cells up in the DOM. */
  attributes?: Record<`data-${string}`, string | number | undefined>;
}

export type DataGridSortDirection = 'asc' | 'desc';

export interface DataGridSortColumn {
  id: string;
  direction: DataGridSortDirection;
}

export interface DataGridSorting {
  /** In order of priority. */
  columns: DataGridSortColumn[];
  onSort: (columns: DataGridSortColumn[]) => void;
}

export interface DataGridHeaderActionItem {
  id: string;
  label: ReactNode;
  iconType?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

/** What the menu of a column header offers. Sorting and moving need the grid to handle them too. */
export interface DataGridColumnActions {
  showSortAsc?: boolean;
  showSortDesc?: boolean;
  /** Labels of the sort actions, instead of the ones worded by the `schema` of the column. */
  sortLabels?: { asc?: ReactNode; desc?: ReactNode };
  showMoveLeft?: boolean;
  showMoveRight?: boolean;
  /** Offered only if the grid has `onHideColumn`. */
  showHide?: false | { label?: ReactNode; iconType?: string; 'data-test-subj'?: string };
  /** Shown after the built-in actions. */
  additional?: DataGridHeaderActionItem[];
}

export interface DataGridColumn<TRow> {
  id: string;
  header: ReactNode;
  /** Plain text name of the column, e.g. for the label of the header menu. Defaults to the id. */
  displayAsText?: string;
  /** Kind of values, only used to word the sort actions: 'datetime', 'numeric', 'boolean' or other. */
  schema?: string;
  /** Needs `sorting` on the grid. */
  isSortable?: boolean;
  /** The actions menu of the header, `false` for none. Defaults to the built-in ones. */
  actions?: DataGridColumnActions | false;
  renderCell: (props: DataGridCellRenderProps<TRow>) => ReactNode;
  /**
   * Width in pixels, or a function of the grid width, used until the user resizes the column.
   * Columns without an initial width share the remaining space.
   */
  initialWidth?: number | ((gridWidth: number) => number);
  minWidth?: number;
  maxWidth?: number;
  /** Whether the user can resize the column by dragging its header edge. */
  isResizable?: boolean;
  /** Actions shown in the cell actions bubble on hover or focus, and in the expansion popover. */
  cellActions?: EuiDataGridColumnCellAction[];
  /** How many of the `cellActions` the bubble shows. All of them are in the popover. Defaults to all. */
  visibleCellActions?: number;
  /** Whether a cell can be expanded into a popover. Defaults to `true`. */
  isExpandable?: boolean;
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
  /** Accessible name of the header, e.g. when it renders no text. */
  headerAriaLabel?: string;
  width: number;
  renderCell: (
    props: Pick<
      DataGridCellRenderProps<TRow>,
      'row' | 'rowIndex' | 'columnId' | 'colIndex' | 'setCellProps'
    >
  ) => ReactNode;
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

/** A row with its id and its index in the `rows` passed to the grid. */
export interface DataGridRowItem<TRow> {
  id: string;
  index: number;
  row: TRow;
}

/** The columns as the grid renders them, control columns included. */
export interface DataGridInternalColumn<TRow> extends DataGridColumn<TRow> {
  isControl: boolean;
  headerAriaLabel?: string;
}

export interface DataGridRef {
  /** Scrolls the row into view if it is part of the virtualized (not pinned) rows. */
  scrollToRow: (rowId: string) => void;
  /** Scrolls the row and/or the column into view. */
  scrollToItem: (params: {
    rowIndex?: number;
    columnId?: string;
    align?: 'start' | 'center' | 'end' | 'auto';
  }) => void;
  /** Moves the focus to a cell, scrolling to it if needed. */
  setFocusedCell: (params: { rowIndex: number; columnId: string }) => void;
  openCellPopover: (params: { rowIndex: number; columnId: string }) => void;
  closeCellPopover: () => void;
}

export interface DataGridScrollInfo {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
}

/** Props of a cell of the footer row. */
export interface DataGridFooterCellRenderProps {
  columnId: string;
  /** Position of the column among all the columns of the grid, starting at 0. */
  colIndex: number;
  /** Whether the column is a leading or trailing control column. */
  isControl: boolean;
}

export type DataGridDensity = 'compact' | 'normal' | 'expanded';

/** How the grid looks, the same options as `EuiDataGrid`'s `gridStyle`. */
export interface DataGridStyle {
  cellPadding?: 's' | 'm' | 'l';
  fontSize?: 's' | 'm' | 'l';
  border?: 'all' | 'horizontal' | 'none';
  stripes?: boolean;
  rowHover?: 'highlight' | 'none';
  header?: 'shade' | 'underline';
  /** Look of the footer row, see `renderFooterCell`. Defaults to `'overline'`. */
  footer?: 'shade' | 'overline' | 'striped';
}

/**
 * Rows grow to fit their content (`'auto'`), or show up to `lineCount` lines of text. A single line
 * does not wrap, like in EuiDataGrid: line breaks collapse and the text ends with an ellipsis.
 */
export type DataGridRowHeight = 'auto' | { lineCount: number };

export interface DataGridProps<TRow> {
  rows: TRow[];
  /** Memoize it, a new array rebuilds the column model. */
  columns: Array<DataGridColumn<TRow>>;
  leadingControlColumns?: Array<DataGridControlColumn<TRow>>;
  trailingControlColumns?: Array<DataGridControlColumn<TRow>>;
  getRowId: (row: TRow) => string;
  /** Accessible name of the grid: its own label, or the id of the element that labels it. */
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  id?: string;
  /** Added to the root element of the grid. */
  className?: string;
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
  /** Defaults to compact text with horizontal borders, stripes and a highlight on hover. */
  gridStyle?: DataGridStyle;
  /** Defaults to `'auto'`. */
  rowHeight?: DataGridRowHeight;
  /** CSS line height of the text in cells, e.g. `'1.6em'`. Defaults to the one of the font size. */
  lineHeight?: string;
  /**
   * Number of data columns, after the leading control columns, that stay in view while the other
   * columns scroll horizontally, e.g. a name column. Defaults to 0.
   */
  stickyColumnCount?: number;
  /** Whether to render the column header row. Defaults to `true`. */
  showHeader?: boolean;
  /** Lines of text of a column header: 'auto' grows with its content. Defaults to 1. */
  headerRowHeight?: number | 'auto';
  /** Enables the sort indicator and actions of the columns that are `isSortable`. */
  sorting?: DataGridSorting;
  /** Enables the "Move left" and "Move right" actions of a column header. */
  onMoveColumn?: (params: { columnId: string; direction: 'left' | 'right' }) => void;
  /** Enables the "Hide column" action of a column header. */
  onHideColumn?: (columnId: string) => void;
  /**
   * Enables reordering the data columns by dragging their headers. `toIndex` is the position of the
   * column among the data columns (without the control columns) after the move.
   */
  onReorderColumn?: (params: { columnId: string; toIndex: number }) => void;
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
  /** Called while the grid scrolls, e.g. to load more rows near the end. Throttle it if it is costly. */
  onScroll?: (info: DataGridScrollInfo) => void;
  /** Rows rendered beyond the visible ones. Defaults to 10, fewer for rows that are expensive to render. */
  overscan?: number;
  /**
   * Whether the popover of an expanded cell has a button to close it. Defaults to `true`, turn it
   * off if the cells render their own (`isDetails`) or Escape is enough.
   */
  showCellPopoverCloseButton?: boolean;
  /** Customizes the popover of an expanded cell. */
  renderCellPopover?: (props: DataGridCellPopoverProps<TRow>) => ReactNode;
  /**
   * Renders a row below the data that stays in view, e.g. a summary of each column. Called for
   * every column, control columns included. Without it there is no footer row.
   */
  renderFooterCell?: (props: DataGridFooterCellRenderProps) => ReactNode;
  /**
   * Called after the grid rendered its rows at their final width, and again whenever the rows or
   * columns change, e.g. to tell a screenshot or a report that the content is ready.
   */
  onRenderComplete?: () => void;
  gridRef?: Ref<DataGridRef>;
}
