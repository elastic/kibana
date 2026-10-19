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
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import DataGrid, {
  Row as RdgRow,
  type CellClickArgs,
  type CellKeyDownArgs,
  type CellMouseEvent,
  type CellKeyboardEvent,
  type Column,
  type DataGridHandle,
  type RenderRowProps,
} from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import type { Header, Row } from '@tanstack/react-table';
import { css } from '@emotion/react';
import { useEuiTheme, type EuiThemeComputed } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  VirtualCell,
  scrollPositionCache,
  type RowVirtualizer,
  type TanStackGridBodyProps,
} from '@kbn/tanstack-data-table';

type GridRow = Row<DataTableRecord>;

const MIN_DATA_COLUMN_WIDTH = 60;
const DEFAULT_HEADER_ROW_HEIGHT = 40;
/** Room for a vertical scrollbar, so flexible columns don't cause horizontal scrolling. */
const SCROLLBAR_ALLOWANCE = 16;
const INTERACTIVE_ELEMENTS = 'button, a, input, [role="button"]';

/** Changes often (selection, find); a context so only the visible cells re-render, not the columns. */
interface BodyState {
  selectedRows: Set<string>;
  expandedDocId: string | undefined;
  findTerm: string;
  findActiveMatch: TanStackGridBodyProps['findActiveMatch'];
  rowIndexOffset: number;
  styles: TanStackGridBodyProps['styles'];
  onFilter: TanStackGridBodyProps['onFilter'];
  setPopoverState: TanStackGridBodyProps['setPopoverState'];
  getColumnStyle: TanStackGridBodyProps['getColumnStyle'];
}
const BodyStateContext = createContext<BodyState | null>(null);

/** Re-renders the header cells whenever the grid shell does (sort indicators, drag state). */
const RenderHeaderCellContext = createContext<TanStackGridBodyProps['renderHeaderCell'] | null>(
  null
);

const EmbeddedHeaderCell = ({ header }: { header: Header<DataTableRecord, unknown> }) => {
  const renderHeaderCell = useContext(RenderHeaderCellContext);
  return <>{renderHeaderCell?.(header, { embedded: true })}</>;
};

/** The TanStack grid cell (popover, cell actions, in-table search highlights) inside a react-data-grid cell. */
const EmbeddedCell = ({
  row,
  columnIndex,
  rowIndex,
}: {
  row: GridRow;
  columnIndex: number;
  rowIndex: number;
}) => {
  const state = useContext(BodyStateContext);
  const cell = row.getVisibleCells()[columnIndex];
  if (!state || !cell) return null;
  const { meta } = cell.column.columnDef;
  const isSelected = state.selectedRows.has(row.original.id);
  return (
    <VirtualCell
      embedded
      cell={cell}
      gridCellAttributes={{
        'data-test-subj': 'dataGridRowCell',
        'data-gridcell-column-id': cell.column.id,
        'data-gridcell-column-index': columnIndex,
        'data-gridcell-row-index': state.rowIndexOffset + rowIndex,
        'data-gridcell-visible-row-index': rowIndex,
      }}
      styles={state.styles}
      isFocused={false}
      onFilter={state.onFilter}
      setPopoverState={state.setPopoverState}
      findTerm={state.findTerm}
      isActiveMatch={
        state.findActiveMatch?.rowIndex === rowIndex &&
        state.findActiveMatch.fieldName === cell.column.id
      }
      getColumnStyle={state.getColumnStyle}
      isRowSelected={Boolean(meta?.isSelect) && isSelected}
      isRowExpanded={Boolean(meta?.isControl) && state.expandedDocId === row.original.id}
    />
  );
};

const getStyles = (euiTheme: EuiThemeComputed) =>
  css({
    '--rdg-color': euiTheme.colors.textParagraph,
    '--rdg-border-color': euiTheme.components.dataGridBorderColor,
    '--rdg-background-color': euiTheme.components.dataGridRowBackground,
    '--rdg-header-background-color': euiTheme.colors.backgroundBasePlain,
    '--rdg-row-hover-background-color': euiTheme.components.dataGridRowBackgroundHover,
    '--rdg-row-selected-background-color': euiTheme.components.dataGridRowBackgroundSelect,
    '--rdg-row-selected-hover-background-color': euiTheme.components.dataGridRowBackgroundSelect,
    '--rdg-selection-color': euiTheme.colors.primary,
    '--rdg-font-size': 'var(--tsg-font-size, 14px)',
    flex: 1,
    blockSize: '100%',
    minWidth: 0,
    border: 'none',
    fontFamily: euiTheme.font.family,
    // The embedded TanStack cells bring their own padding and vertical lines.
    '.rdg-cell': {
      display: 'flex',
      alignItems: 'stretch',
      padding: 0,
      borderInlineEnd: 'none',
      lineHeight: 'normal',
      overflow: 'visible',
      '& > *': { flex: '1 1 auto', minWidth: 0 },
    },
    '.rdg-row.rdgKbn__row--expanded': {
      backgroundColor: euiTheme.components.dataGridRowBackgroundSelect,
    },
    '.rdg-row.rdgKbn__row--anchor .unifiedDataTable__cell--highlight': {
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
    },
  });

const buildColumns = (
  headers: Array<Header<DataTableRecord, unknown>>,
  getColumnStyle: TanStackGridBodyProps['getColumnStyle'],
  gridWidth: number
): Array<Column<GridRow>> => {
  const layouts = headers.map(({ column }) => {
    const { meta } = column.columnDef;
    const isControl = Boolean(meta?.isControl || meta?.isSelect);
    const style = isControl
      ? undefined
      : getColumnStyle({
          id: column.id,
          isSummary: meta?.isSummary,
          isTimestamp: meta?.isTimestamp,
        });
    const isFlexible = Boolean(style?.flex);
    return {
      isControl,
      isFlexible,
      fixedWidth: isControl ? column.getSize() : isFlexible ? 0 : Number(style?.width),
      minWidth: isFlexible
        ? Math.max(Number(style?.minWidth) || 0, MIN_DATA_COLUMN_WIDTH)
        : MIN_DATA_COLUMN_WIDTH,
    };
  });
  // Flexible columns share the free space evenly, like the flex layout of the TanStack body.
  // Explicit widths: react-data-grid measures `auto`/`fr` widths once and keeps them per column.
  const fixedTotal = layouts.reduce((total, { fixedWidth }) => total + fixedWidth, 0);
  const flexibleCount = layouts.filter(({ isFlexible }) => isFlexible).length;
  const flexibleWidth = flexibleCount
    ? Math.floor((gridWidth - fixedTotal - SCROLLBAR_ALLOWANCE) / flexibleCount)
    : 0;

  return headers.map((header, columnIndex) => {
    const { column } = header;
    const { isControl, isFlexible, fixedWidth, minWidth } = layouts[columnIndex];
    return {
      key: column.id,
      name: column.id,
      width: isFlexible ? Math.max(flexibleWidth, minWidth) : fixedWidth,
      minWidth: isControl ? fixedWidth : minWidth,
      maxWidth: isControl ? fixedWidth : undefined,
      frozen: column.getIsPinned() === 'left',
      // Resizing, sorting and reordering are handled by the embedded TanStack header cell.
      resizable: false,
      sortable: false,
      renderHeaderCell: () => <EmbeddedHeaderCell header={header} />,
      renderCell: ({ row, rowIdx }) => (
        <EmbeddedCell row={row} columnIndex={columnIndex} rowIndex={rowIdx} />
      ),
    };
  });
};

/**
 * Grid body for `TanStackDataGrid` that renders rows and columns with react-data-grid (row and
 * column virtualization), reusing the TanStack grid's header and body cells.
 */
export const RdgGridBody = React.memo(function RdgGridBody({
  scrollRef,
  virtualizerRef,
  headerGroups,
  renderHeaderCell,
  headerRowHeight,
  overlay,
  tableRows,
  rowIndexOffset,
  rowHeight,
  scrollKey,
  styles,
  selectedRows,
  expandedDocId,
  onFilter,
  setPopoverState,
  findTerm,
  findActiveMatch,
  getColumnStyle,
}: TanStackGridBodyProps) {
  const { euiTheme, colorMode } = useEuiTheme();
  const gridStyles = useMemo(() => getStyles(euiTheme), [euiTheme]);
  const gridRef = useRef<DataGridHandle | null>(null);

  const setGridRef = useCallback(
    (handle: DataGridHandle | null) => {
      gridRef.current = handle;
      scrollRef.current = handle?.element ?? null;
    },
    [scrollRef]
  );

  // The grid shell scrolls to rows (expanded document, keyboard) through the virtualizer API.
  virtualizerRef.current = useMemo<RowVirtualizer>(
    () => ({
      getVirtualItems: () => [],
      getTotalSize: () => 0,
      measureElement: () => {},
      measure: () => {},
      scrollToIndex: (index) => gridRef.current?.scrollToCell({ rowIdx: index }),
      scrollMargin: 0,
    }),
    []
  );

  useEffect(() => {
    const initialScrollTop = scrollPositionCache.get(scrollKey);
    if (initialScrollTop && scrollRef.current) {
      scrollRef.current.scrollTop = initialScrollTop;
    }
  }, [scrollKey, scrollRef]);

  const headers = useMemo(
    () => headerGroups[headerGroups.length - 1]?.headers ?? [],
    [headerGroups]
  );

  // Changes when columns are resized, pinned or the grid width changes the layout.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
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

  const layoutKey = headers
    .map(({ column }) => `${column.id}:${column.getSize()}:${column.getIsPinned() || ''}`)
    .join('|')
    .concat(`@${gridWidth}`);

  // Rebuilt only when the columns or their layout change: new column objects make react-data-grid
  // recompute all column metrics. Sizes are read from TanStack's column state, hence the layout key.
  const columnsCacheRef = useRef<{
    key: string;
    headers: typeof headers;
    getColumnStyle: TanStackGridBodyProps['getColumnStyle'];
    columns: Array<Column<GridRow>>;
  }>();
  const cached = columnsCacheRef.current;
  const columnsCache =
    cached &&
    cached.key === layoutKey &&
    cached.headers === headers &&
    cached.getColumnStyle === getColumnStyle
      ? cached
      : {
          key: layoutKey,
          headers,
          getColumnStyle,
          columns: buildColumns(headers, getColumnStyle, gridWidth),
        };
  columnsCacheRef.current = columnsCache;
  const { columns } = columnsCache;

  const bodyState = useMemo<BodyState>(
    () => ({
      selectedRows,
      expandedDocId,
      findTerm,
      findActiveMatch,
      rowIndexOffset,
      styles,
      onFilter,
      setPopoverState,
      getColumnStyle,
    }),
    [
      expandedDocId,
      findActiveMatch,
      findTerm,
      getColumnStyle,
      onFilter,
      rowIndexOffset,
      selectedRows,
      setPopoverState,
      styles,
    ]
  );

  useEffect(() => {
    if (!findActiveMatch) return;
    const idx = headers.findIndex(({ column }) => column.id === findActiveMatch.fieldName);
    gridRef.current?.scrollToCell({ rowIdx: findActiveMatch.rowIndex, idx: Math.max(idx, 0) });
  }, [findActiveMatch, headers]);

  const rowClass = useCallback(
    (row: GridRow) =>
      [
        row.original.id === expandedDocId && 'rdgKbn__row--expanded',
        row.original.isAnchor && 'rdgKbn__row--anchor',
      ]
        .filter(Boolean)
        .join(' ') || undefined,
    [expandedDocId]
  );

  const renderRow = useCallback(
    (key: React.Key, props: RenderRowProps<GridRow>) => (
      <RdgRow
        key={key}
        {...props}
        data-grid-row-index={rowIndexOffset + props.rowIdx}
        data-grid-visible-row-index={props.rowIdx}
      />
    ),
    [rowIndexOffset]
  );

  // Enter and space open the cell popover, like on the cells of the TanStack grid.
  const onCellKeyDown = useCallback((_args: CellKeyDownArgs<GridRow>, event: CellKeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const content = event.currentTarget.querySelector<HTMLElement>(
      '[data-test-subj="dataGridRowCell"]'
    );
    if (!content || (event.target as HTMLElement).closest(INTERACTIVE_ELEMENTS)) return;
    event.preventGridDefault();
    event.preventDefault();
    content.click();
  }, []);

  // Clicking a control in a cell (expand toggle, checkbox, row actions) must not select and focus
  // the cell, which would take focus from what the control opens, e.g. the document flyout.
  const onCellClick = useCallback((_args: CellClickArgs<GridRow>, event: CellMouseEvent) => {
    if ((event.target as HTMLElement).closest(INTERACTIVE_ELEMENTS)) {
      event.preventGridDefault();
    }
  }, []);

  const rowKeyGetter = useCallback((row: GridRow) => row.original.id, []);

  // react-data-grid renders its own header row; tag it like the other grids' header rows, which
  // the shared test helpers read the column titles from.
  useEffect(() => {
    wrapperRef.current
      ?.querySelector('.rdg-header-row')
      ?.setAttribute('data-test-subj', 'dataGridHeader');
  });

  return (
    <RenderHeaderCellContext.Provider value={renderHeaderCell}>
      <BodyStateContext.Provider value={bodyState}>
        <div ref={wrapperRef} css={wrapperStyles} data-test-subj="euiDataGridBody">
          <DataGrid
            ref={setGridRef}
            className={colorMode === 'DARK' ? 'rdg-dark' : 'rdg-light'}
            css={gridStyles}
            aria-rowcount={tableRows.length + 1}
            columns={columns}
            rows={tableRows}
            rowKeyGetter={rowKeyGetter}
            rowHeight={rowHeight}
            headerRowHeight={headerRowHeight ?? DEFAULT_HEADER_ROW_HEIGHT}
            selectedRows={selectedRows}
            rowClass={rowClass}
            onCellClick={onCellClick}
            onCellKeyDown={onCellKeyDown}
            renderers={{ renderRow }}
          />
          {overlay}
        </div>
      </BodyStateContext.Provider>
    </RenderHeaderCellContext.Provider>
  );
});

const wrapperStyles = css({
  position: 'relative',
  display: 'flex',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
});
