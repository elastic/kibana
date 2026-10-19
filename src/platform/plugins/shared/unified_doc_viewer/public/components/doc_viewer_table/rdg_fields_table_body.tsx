/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import DataGrid, {
  type CellClickArgs,
  type CellMouseEvent,
  type Column,
  type DataGridHandle,
} from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { flexRender, type Cell, type Header, type Row } from '@tanstack/react-table';
import { css } from '@emotion/react';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import type { FieldRow } from './field_row';
import { GridCellActiveContext, GridCellAnchorContext } from './table_grid_cell_contexts';
import type { TableStyles } from './tanstack_table_grid';

const MIN_VALUE_COLUMN_WIDTH = 100;
/** Room for a vertical scrollbar, so the value column doesn't cause horizontal scrolling. */
const SCROLLBAR_ALLOWANCE = 16;
const ROW_BORDER_WIDTH = 1;
const INTERACTIVE_ELEMENTS = 'button, a, input, [role="button"]';
/** Cell actions and their popover render outside the cell. */
const CELL_ACTIONS_OVERLAYS = '[role="toolbar"], [data-test-subj="euiDataGridExpansionPopover"]';

type ReportCellHeight = (rowId: string, columnId: string, height: number) => void;
const ReportCellHeightContext = createContext<ReportCellHeight>(() => {});

/**
 * A fields table cell inside a react-data-grid cell. Like the TanStack body's cell, it tracks hover
 * and focus for the cell actions; it also reports its content height, as react-data-grid needs
 * explicit row heights.
 */
const RdgFieldCell = memo(function RdgFieldCell({
  cell,
  styles,
  hasActions,
}: {
  cell: Cell<FieldRow, unknown>;
  styles: TableStyles;
  hasActions: boolean;
}) {
  const reportCellHeight = useContext(ReportCellHeightContext);
  const contentRef = useRef<HTMLDivElement>(null);
  // Cell actions and popovers anchor to react-data-grid's cell, which also gets the keyboard focus.
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const { id: columnId } = cell.column;
  const rowId = cell.row.id;

  useLayoutEffect(() => {
    anchorRef.current = contentRef.current?.closest<HTMLDivElement>('[role="gridcell"]') ?? null;
  });

  // Hover uses React events: they treat the portaled cell actions toolbar as part of the cell.
  const activate = useCallback(() => setIsActive(true), []);
  const deactivate = useCallback(() => setIsActive(false), []);

  // Keyboard focus lands on react-data-grid's cell, outside this component's elements.
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || !hasActions) return;
    const onFocusOut = (event: FocusEvent) => {
      // No related target: the focused element was removed (e.g. the actions trigger replaced by
      // the actions), focus didn't move elsewhere.
      const next = event.relatedTarget as HTMLElement | null;
      if (next && !anchor.contains(next) && !next.closest(CELL_ACTIONS_OVERLAYS)) {
        setIsActive(false);
      }
    };
    anchor.addEventListener('focusin', activate);
    anchor.addEventListener('focusout', onFocusOut);
    return () => {
      anchor.removeEventListener('focusin', activate);
      anchor.removeEventListener('focusout', onFocusOut);
    };
  }, [activate, hasActions]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(([entry]) =>
      reportCellHeight(
        rowId,
        columnId,
        entry.borderBoxSize?.[0]?.blockSize ?? content.getBoundingClientRect().height
      )
    );
    observer.observe(content);
    return () => observer.disconnect();
  }, [columnId, reportCellHeight, rowId]);

  return (
    <div
      css={fillStyles}
      onMouseEnter={hasActions ? activate : undefined}
      onMouseLeave={hasActions ? deactivate : undefined}
    >
      <div
        ref={contentRef}
        data-gridcell-column-id={columnId}
        css={[styles.cell, hasActions && styles.cellWithActions, contentStyles]}
      >
        <GridCellAnchorContext.Provider value={anchorRef}>
          <GridCellActiveContext.Provider value={isActive}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </GridCellActiveContext.Provider>
        </GridCellAnchorContext.Provider>
      </div>
    </div>
  );
});

// Fills the cell for hover; the content keeps its natural height, which sets the row height.
const fillStyles = css({ display: 'flex', inlineSize: '100%', blockSize: '100%' });
const contentStyles = css({ inlineSize: '100%', alignSelf: 'flex-start' });

const getGridStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    '--rdg-color': euiTheme.colors.textParagraph,
    '--rdg-border-color': euiTheme.components.dataGridBorderColor,
    '--rdg-background-color': euiTheme.components.dataGridRowBackground,
    '--rdg-row-hover-background-color': euiTheme.components.dataGridRowBackgroundHover,
    '--rdg-selection-color': euiTheme.colors.primary,
    '--rdg-font-size': 'inherit',
    flex: 1,
    minBlockSize: 0,
    blockSize: 'auto',
    border: 'none',
    fontFamily: 'inherit',
    '--rdg-summary-border-color': euiTheme.colors.borderBasePlain,
    '--rdg-header-background-color': euiTheme.components.dataGridRowBackground,
    '.rdg-row': { lineHeight: 'normal' },
    '.rdg-row.kbnDocViewer__rdgRow--striped': {
      backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStriped,
    },
    '.rdg-row.kbnDocViewer__rdgRow--striped:hover': {
      backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStripedHover,
    },
    '.rdg-cell': {
      display: 'flex',
      padding: 0,
      borderInlineEnd: 'none',
      whiteSpace: 'normal',
      overflow: 'visible',
    },
  });

export interface RdgFieldsTableBodyProps {
  /** The rows below the pinned fields. */
  rows: Array<Row<FieldRow>>;
  /** Pinned fields, rendered as sticky rows below the header. */
  pinnedRows: Array<Row<FieldRow>>;
  headers: Array<Header<FieldRow, unknown>>;
  renderHeaderCell: (header: Header<FieldRow, unknown>) => React.ReactNode;
  /** 0 hides the header. */
  headerRowHeight: number;
  styles: TableStyles;
  /** Fixed width per column id; the value column gets the remaining width. */
  fixedColumnWidths: Record<string, number>;
  valueColumnId: string;
  /** Columns without cell actions (the pin column). */
  controlColumnIds: string[];
  estimatedRowHeight: number;
  ariaLabel: string;
  scrollTopRef: React.MutableRefObject<number>;
  /** Filled with a function that scrolls to a row of `rows`. */
  scrollToIndexRef: React.MutableRefObject<((index: number) => void) | undefined>;
}

/** The rows of the doc viewer fields table rendered and virtualized by react-data-grid. */
export const RdgFieldsTableBody = ({
  rows,
  pinnedRows,
  headers,
  renderHeaderCell,
  headerRowHeight,
  styles,
  fixedColumnWidths,
  valueColumnId,
  controlColumnIds,
  estimatedRowHeight,
  ariaLabel,
  scrollTopRef,
  scrollToIndexRef,
}: RdgFieldsTableBodyProps) => {
  const euiThemeContext = useEuiTheme();
  const gridStyles = useMemo(() => getGridStyles(euiThemeContext), [euiThemeContext]);
  const gridRef = useRef<DataGridHandle | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  scrollToIndexRef.current = (index: number) => gridRef.current?.scrollToCell({ rowIdx: index });

  // ── Row heights: measured cell content, flushed once per frame ──
  const [rowHeights, setRowHeights] = useState<ReadonlyMap<string, number>>(new Map());
  const cellHeightsRef = useRef(new Map<string, Record<string, number>>());
  const frameRef = useRef<number>();
  const reportCellHeight = useCallback<ReportCellHeight>((rowId, columnId, height) => {
    const cellHeights = cellHeightsRef.current.get(rowId) ?? {};
    if (cellHeights[columnId] === height) return;
    cellHeightsRef.current.set(rowId, { ...cellHeights, [columnId]: height });
    if (frameRef.current !== undefined) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      setRowHeights((previous) => {
        let changed = false;
        const next = new Map(previous);
        for (const [id, heights] of cellHeightsRef.current) {
          const rowHeight = Math.ceil(Math.max(...Object.values(heights))) + ROW_BORDER_WIDTH;
          if (next.get(id) !== rowHeight) {
            next.set(id, rowHeight);
            changed = true;
          }
        }
        return changed ? next : previous;
      });
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(frameRef.current ?? 0), []);

  const rowHeight = useCallback(
    (row: Row<FieldRow>) =>
      Math.max(rowHeights.get(row.id) ?? estimatedRowHeight, estimatedRowHeight),
    [estimatedRowHeight, rowHeights]
  );
  // react-data-grid has one height for all summary rows: the tallest pinned field.
  const pinnedRowHeight = pinnedRows.reduce((height, row) => Math.max(height, rowHeight(row)), 0);

  // ── Columns: explicit widths, as react-data-grid keeps measured `auto` widths per column ──
  const [gridWidth, setGridWidth] = useState(0);
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    setGridWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) =>
      setGridWidth(Math.round(entry.contentRect.width))
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fixedTotal = Object.values(fixedColumnWidths).reduce((total, width) => total + width, 0);
  const valueColumnWidth = Math.max(
    gridWidth - fixedTotal - SCROLLBAR_ALLOWANCE,
    MIN_VALUE_COLUMN_WIDTH
  );

  const columns = useMemo<Array<Column<Row<FieldRow>, Row<FieldRow>>>>(
    () =>
      headers.map((header, columnIndex) => {
        const columnId = header.column.id;
        const width =
          columnId === valueColumnId ? valueColumnWidth : fixedColumnWidths[columnId] ?? 0;
        const hasActions = !controlColumnIds.includes(columnId);
        return {
          key: columnId,
          name: '',
          width,
          minWidth: width,
          maxWidth: width,
          renderHeaderCell: () => renderHeaderCell(header),
          renderCell: ({ row }) => renderFieldCell(row, columnIndex, hasActions, styles),
          renderSummaryCell: ({ row }) => renderFieldCell(row, columnIndex, hasActions, styles),
        };
      }),
    [
      controlColumnIds,
      fixedColumnWidths,
      headers,
      renderHeaderCell,
      styles,
      valueColumnId,
      valueColumnWidth,
    ]
  );

  const rowClass = useCallback(
    (_row: Row<FieldRow>, rowIdx: number) =>
      (pinnedRows.length + rowIdx) % 2 === 1
        ? 'kbnDocViewer__tanStackRow kbnDocViewer__rdgRow--striped'
        : 'kbnDocViewer__tanStackRow',
    [pinnedRows.length]
  );

  // react-data-grid passes a new handle on every render: restore the scroll position only once.
  const hasRestoredScrollRef = useRef(false);
  const setGridRef = useCallback(
    (handle: DataGridHandle | null) => {
      gridRef.current = handle;
      if (handle?.element && !hasRestoredScrollRef.current) {
        hasRestoredScrollRef.current = true;
        handle.element.scrollTop = scrollTopRef.current;
      }
    },
    [scrollTopRef]
  );

  // Measured rows change the scroll height; stay at the bottom once scrolled there.
  const isScrolledToBottomRef = useRef(false);
  const onScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      scrollTopRef.current = scrollTop;
      // Within a row of the bottom: rows measured meanwhile may already have grown the content.
      isScrolledToBottomRef.current = scrollTop + clientHeight >= scrollHeight - estimatedRowHeight;
    },
    [estimatedRowHeight, scrollTopRef]
  );
  useLayoutEffect(() => {
    const element = gridRef.current?.element;
    if (element && isScrolledToBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [rowHeights]);

  // Clicking a control (pin, cell action) must not select and focus the cell instead.
  const onCellClick = useCallback(
    (_args: CellClickArgs<Row<FieldRow>, Row<FieldRow>>, event: CellMouseEvent) => {
      if ((event.target as HTMLElement).closest(INTERACTIVE_ELEMENTS)) {
        event.preventGridDefault();
      }
    },
    []
  );

  const rowKeyGetter = useCallback((row: Row<FieldRow>) => row.id, []);

  // Like the EuiDataGrid fields table, the grid is one tab stop: Tab leaves it instead of moving
  // between cells (react-data-grid's default). Arrow keys still navigate the cells.
  const onKeyDownCapture = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab' && (event.target as HTMLElement).closest('.rdg-cell')) {
      event.stopPropagation();
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      css={wrapperStyles}
      data-test-subj="unifiedDocViewerRdgFieldsTable"
      onKeyDownCapture={onKeyDownCapture}
    >
      <ReportCellHeightContext.Provider value={reportCellHeight}>
        <DataGrid
          ref={setGridRef}
          className={euiThemeContext.colorMode === 'DARK' ? 'rdg-dark' : 'rdg-light'}
          css={[gridStyles, headerRowHeight === 0 && hiddenHeaderStyles]}
          aria-label={ariaLabel}
          columns={columns}
          rows={rows}
          rowKeyGetter={rowKeyGetter}
          rowHeight={rowHeight}
          headerRowHeight={headerRowHeight}
          topSummaryRows={pinnedRows}
          summaryRowHeight={pinnedRowHeight || estimatedRowHeight}
          rowClass={rowClass}
          onScroll={onScroll}
          onCellClick={onCellClick}
        />
      </ReportCellHeightContext.Provider>
    </div>
  );
};

const renderFieldCell = (
  row: Row<FieldRow>,
  columnIndex: number,
  hasActions: boolean,
  styles: TableStyles
) => {
  const cell = row.getVisibleCells()[columnIndex];
  return cell ? <RdgFieldCell cell={cell} styles={styles} hasActions={hasActions} /> : null;
};

const hiddenHeaderStyles = css({ '.rdg-header-row': { display: 'none' } });

const wrapperStyles = css({
  display: 'flex',
  flex: 1,
  minBlockSize: 0,
  minInlineSize: 0,
});
