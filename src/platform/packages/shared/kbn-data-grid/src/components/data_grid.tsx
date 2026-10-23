/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties } from 'react';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { OverrideCopiedTabularContent, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { DEFAULT_DATA_GRID_STYLE, DEFAULT_ESTIMATED_ROW_HEIGHT, OVERSCAN } from '../constants';
import { useColumnSizing } from '../hooks/use_column_sizing';
import { useColumnDrag } from '../hooks/use_column_drag';
import { useColumnVirtualization } from '../hooks/use_column_virtualization';
import { useGridNavigation } from '../hooks/use_grid_navigation';
import { componentStyles } from '../styles';
import { observeCellContentFocus } from '../utils/cell_content_focus';
import { getLinesRowHeight } from '../utils/row_height';
import type {
  DataGridCellKey,
  DataGridColumn,
  DataGridControlColumn,
  DataGridExpandedCell,
  DataGridInternalColumn,
  DataGridProps,
  DataGridRef,
  DataGridRowItem,
} from '../types';
import { DataGridFooterRow } from './data_grid_footer_row';
import { DataGridHeaderRow } from './data_grid_header_row';
import type { DataGridColumnSlices } from './data_grid_row';
import { DataGridRow } from './data_grid_row';

const toInternalColumn = <TRow,>({
  width,
  ...column
}: DataGridControlColumn<TRow>): DataGridInternalColumn<TRow> => ({
  ...column,
  initialWidth: width,
  minWidth: width,
  maxWidth: width,
  isControl: true,
});

const getRowHeightMode = (lineCount: number | undefined): 'auto' | 'single' | 'lines' => {
  if (lineCount === undefined) {
    return 'auto';
  }
  return lineCount === 1 ? 'single' : 'lines';
};

/**
 * Generic, virtualized data grid. It knows nothing about the shape of the rows: columns describe how
 * to render a row. Memoize `columns`, a new array rebuilds the column model.
 */
export const DataGrid = <TRow,>({
  rows,
  columns: dataColumns,
  leadingControlColumns,
  trailingControlColumns,
  getRowId,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  id: gridId,
  className,
  'data-test-subj': dataTestSubj = 'kbnDataGrid',
  getCellProps,
  getRowProps,
  pinnedRowIds,
  showHeader = true,
  stickyColumnCount = 0,
  gridStyle,
  rowHeight = 'auto',
  lineHeight,
  headerRowHeight,
  sorting,
  onMoveColumn,
  onHideColumn,
  onReorderColumn,
  estimatedRowHeight: estimatedRowHeightProp,
  columnWidths,
  onColumnResize,
  initialScrollOffset = 0,
  onScrollOffsetChange,
  onScroll: onScrollInfo,
  overscan = OVERSCAN,
  renderCellPopover,
  showCellPopoverCloseButton = true,
  renderFooterCell,
  onRenderComplete,
  gridRef,
}: DataGridProps<TRow>) => {
  const styles = useMemoCss(componentStyles);
  const themeContext = useEuiTheme();
  const { cellPadding, fontSize, border, stripes, rowHover, header, footer } = {
    ...DEFAULT_DATA_GRID_STYLE,
    ...gridStyle,
  };
  const lineCount = rowHeight === 'auto' ? undefined : rowHeight.lineCount;
  // CSS custom properties are not part of React's CSSProperties type.
  const containerStyle = useMemo(
    () =>
      ({
        '--kbnDataGridRowLines': lineCount,
        '--kbnDataGridLineHeight': lineHeight,
      } as CSSProperties),
    [lineCount, lineHeight]
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Rows with a number of lines have a known height: estimating it keeps the scroll height and
  // scrolling to a row right before the rows are measured.
  const estimatedRowHeight = useMemo(
    () =>
      estimatedRowHeightProp ??
      (lineCount === undefined
        ? DEFAULT_ESTIMATED_ROW_HEIGHT
        : getLinesRowHeight(themeContext, {
            lineCount,
            fontSize,
            cellPadding,
            hasBorder: border !== 'none',
            lineHeight,
          })),
    [estimatedRowHeightProp, lineCount, themeContext, fontSize, cellPadding, border, lineHeight]
  );

  // A column that did not change keeps its internal column, so its cells do not render again when
  // the consumer builds the array of columns anew.
  const internalColumns = useRef(
    new WeakMap<DataGridColumn<TRow> | DataGridControlColumn<TRow>, DataGridInternalColumn<TRow>>()
  );
  const columns = useMemo<Array<DataGridInternalColumn<TRow>>>(() => {
    const getInternalColumn = (
      column: DataGridColumn<TRow> | DataGridControlColumn<TRow>,
      toInternal: () => DataGridInternalColumn<TRow>
    ) => {
      const cached = internalColumns.current.get(column);
      if (cached) {
        return cached;
      }
      const internal = toInternal();
      internalColumns.current.set(column, internal);
      return internal;
    };
    return [
      ...(leadingControlColumns ?? []).map((column) =>
        getInternalColumn(column, () => toInternalColumn(column))
      ),
      ...dataColumns.map((column) =>
        getInternalColumn(column, () => ({ ...column, isControl: false }))
      ),
      ...(trailingControlColumns ?? []).map((column) =>
        getInternalColumn(column, () => toInternalColumn(column))
      ),
    ];
  }, [dataColumns, leadingControlColumns, trailingControlColumns]);

  // The scroll element is also the measured grid width, used for the initial column widths.
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const setScrollRef = useCallback((element: HTMLDivElement | null) => {
    scrollRef.current = element;
    setScrollElement(element);
  }, []);
  const { width: gridWidth } = useResizeObserver(scrollElement, 'width');

  // Interactive cell content stays out of the tab order until its cell is entered.
  useEffect(
    () => (scrollElement ? observeCellContentFocus(scrollElement) : undefined),
    [scrollElement]
  );

  // Header and pinned rows share one sticky block, which the virtualized rows scroll below.
  const [stickyElement, setStickyElement] = useState<HTMLDivElement | null>(null);
  const { height: stickyHeight } = useResizeObserver(stickyElement, 'height');
  // The footer row stays at the bottom: rows scrolled into view must not end up below it.
  const [footerElement, setFooterElement] = useState<HTMLDivElement | null>(null);
  const { height: footerHeight } = useResizeObserver(footerElement, 'height');
  const hasFooter = Boolean(renderFooterCell);

  const { widths, resizingColumnId, startResize, resetColumnWidth } = useColumnSizing({
    columns,
    gridWidth,
    columnWidths,
    onColumnResize,
  });
  const { dragState, startDrag } = useColumnDrag({ scrollRef, columns, onReorderColumn });
  const columnVirtualization = useColumnVirtualization({
    scrollRef,
    columns,
    widths,
    stickyColumnCount,
  });

  // Pinning is owned by the parent, the grid shows the pinned rows in their own section.
  const { pinnedRows, virtualizedRows } = useMemo(() => {
    const pinnedIds = new Set(pinnedRowIds);
    const pinned: Array<DataGridRowItem<TRow>> = [];
    const virtualized: Array<DataGridRowItem<TRow>> = [];
    rows.forEach((row, index) => {
      const item = { id: getRowId(row), index, row };
      (pinnedIds.has(item.id) ? pinned : virtualized).push(item);
    });
    return { pinnedRows: pinned, virtualizedRows: virtualized };
  }, [rows, getRowId, pinnedRowIds]);

  const estimateSize = useCallback(() => estimatedRowHeight, [estimatedRowHeight]);
  // Must be stable: a new function makes the virtualizer rebuild all row measurements.
  const getItemKey = useCallback(
    (index: number) => virtualizedRows[index]?.id ?? index,
    [virtualizedRows]
  );

  const rowVirtualizer = useVirtualizer({
    count: virtualizedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan,
    initialOffset: initialScrollOffset,
    getItemKey,
    scrollMargin: stickyHeight,
    scrollPaddingStart: stickyHeight,
    scrollPaddingEnd: footerHeight,
  });
  // The virtualizer keeps the sizes it estimated: a new estimate, e.g. for another line count, needs
  // a new measurement.
  const previousEstimateRef = useRef(estimatedRowHeight);
  useEffect(() => {
    if (previousEstimateRef.current !== estimatedRowHeight) {
      previousEstimateRef.current = estimatedRowHeight;
      rowVirtualizer.measure();
    }
  }, [rowVirtualizer, estimatedRowHeight]);
  const virtualItems = rowVirtualizer.getVirtualItems();

  const scrollToVirtualizedRow = useCallback(
    (index: number) => rowVirtualizer.scrollToIndex(index),
    [rowVirtualizer]
  );

  const { ariaRowIndexOffset, footerRow, getTabStopColIndex, onFocus, onKeyDown, focusCell } =
    useGridNavigation({
      scrollRef,
      showHeader,
      colCount: columns.length,
      firstDataColIndex: columnVirtualization.leadingControlCount + 1,
      rowCount: rows.length,
      hasFooter,
      pinnedRowCount: pinnedRows.length,
      virtualItems,
      virtualizedRowCount: virtualizedRows.length,
      scrollToVirtualizedRow,
      renderedColumnIndexes: columnVirtualization.renderedIndexes,
      scrollToColumn: columnVirtualization.scrollToColumn,
    });

  // Reading the scroll metrics forces a layout: read them once per frame, at its start, instead of
  // on every scroll event, which can come right after the virtualizers rendered.
  const scrollCallbacksRef = useRef({ onScrollOffsetChange, onScrollInfo });
  scrollCallbacksRef.current = { onScrollOffsetChange, onScrollInfo };
  const scrollFrameRef = useRef<number>();
  const reportScroll = useCallback(() => {
    scrollFrameRef.current = undefined;
    const element = scrollRef.current;
    const { onScrollOffsetChange: onOffset, onScrollInfo: onInfo } = scrollCallbacksRef.current;
    if (!element) {
      return;
    }
    onOffset?.(element.scrollTop);
    onInfo?.({
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft,
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
    });
  }, []);
  const hasScrollCallback = Boolean(onScrollOffsetChange || onScrollInfo);
  const onScroll = useCallback(() => {
    if (hasScrollCallback && scrollFrameRef.current === undefined) {
      scrollFrameRef.current = requestAnimationFrame(reportScroll);
    }
  }, [hasScrollCallback, reportScroll]);
  // A layout effect, so the last position is still read from the attached element on unmount.
  useLayoutEffect(
    () => () => {
      if (scrollFrameRef.current !== undefined) {
        cancelAnimationFrame(scrollFrameRef.current);
        reportScroll();
      }
    },
    [reportScroll]
  );

  const {
    renderedIndexes,
    leadingCount,
    middleCount,
    layouts,
    startSpacer,
    endSpacer,
    totalWidth,
  } = columnVirtualization;
  const slices = useMemo<DataGridColumnSlices<TRow>>(
    () => ({
      columns,
      layouts,
      leading: renderedIndexes.filter((index) => index < leadingCount),
      middle: renderedIndexes.filter(
        (index) => index >= leadingCount && index < leadingCount + middleCount
      ),
      trailing: renderedIndexes.filter((index) => index >= leadingCount + middleCount),
      startSpacer,
      endSpacer,
      totalWidth,
    }),
    [
      columns,
      layouts,
      renderedIndexes,
      leadingCount,
      middleCount,
      startSpacer,
      endSpacer,
      totalWidth,
    ]
  );

  // Only one cell can be expanded: opening another replaces it.
  const [expandedCell, setExpandedCell] = useState<DataGridExpandedCell>();
  // Only closes the cell that asks for it: the popover of a previously expanded cell can report
  // its close (outside click, focus trap) after another cell was opened, which must stay open.
  const closeExpansion = useCallback(
    ({ rowId, columnId }: DataGridCellKey) =>
      setExpandedCell((prev) =>
        prev?.rowId === rowId && prev.columnId === columnId ? undefined : prev
      ),
    []
  );
  useEffect(() => {
    if (expandedCell && !rows.some((row) => getRowId(row) === expandedCell.rowId)) {
      setExpandedCell(undefined);
    }
  }, [rows, getRowId, expandedCell]);

  useImperativeHandle(
    gridRef,
    () => {
      const getVirtualizedIndex = (rowIndex: number) =>
        virtualizedRows.findIndex((item) => item.index === rowIndex);
      const getAriaRowIndex = (rowIndex: number) => {
        const pinnedIndex = pinnedRows.findIndex((item) => item.index === rowIndex);
        if (pinnedIndex >= 0) {
          return pinnedIndex + ariaRowIndexOffset;
        }
        const virtualizedIndex = getVirtualizedIndex(rowIndex);
        return virtualizedIndex >= 0
          ? pinnedRows.length + virtualizedIndex + ariaRowIndexOffset
          : undefined;
      };
      const scrollToItem: DataGridRef['scrollToItem'] = ({ rowIndex, columnId, align }) => {
        const virtualizedIndex = rowIndex === undefined ? -1 : getVirtualizedIndex(rowIndex);
        if (virtualizedIndex >= 0) {
          rowVirtualizer.scrollToIndex(virtualizedIndex, { align });
        }
        const columnIndex = columns.findIndex(({ id }) => id === columnId);
        if (columnIndex >= 0) {
          columnVirtualization.scrollToColumn(columnIndex);
        }
      };

      return {
        scrollToRow: (rowId: string) => {
          const index = virtualizedRows.findIndex(({ id }) => id === rowId);
          if (index >= 0) {
            rowVirtualizer.scrollToIndex(index);
          }
        },
        scrollToItem,
        setFocusedCell: ({ rowIndex, columnId }) => {
          const row = getAriaRowIndex(rowIndex);
          const columnIndex = columns.findIndex(({ id }) => id === columnId);
          if (row !== undefined && columnIndex >= 0) {
            focusCell({ row, col: columnIndex + 1 });
          }
        },
        openCellPopover: ({ rowIndex, columnId }) => {
          const item = rows[rowIndex] === undefined ? undefined : getRowId(rows[rowIndex]);
          const ariaRowIndex = getAriaRowIndex(rowIndex);
          const columnIndex = columns.findIndex(({ id }) => id === columnId);
          if (item === undefined || ariaRowIndex === undefined || columnIndex < 0) {
            return;
          }
          scrollToItem({ rowIndex, columnId });
          // The cell may only be rendered after scrolling to it.
          let attempts = 10;
          const open = () => {
            const cell = scrollRef.current?.querySelector(
              `[role="row"][aria-rowindex="${ariaRowIndex}"] [aria-colindex="${columnIndex + 1}"]`
            );
            if (cell) {
              setExpandedCell({
                rowId: item,
                columnId,
                anchorRect: cell.getBoundingClientRect(),
              });
            } else if (--attempts > 0) {
              requestAnimationFrame(open);
            }
          };
          open();
        },
        closeCellPopover: () => setExpandedCell(undefined),
      };
    },
    [
      rows,
      getRowId,
      columns,
      pinnedRows,
      virtualizedRows,
      ariaRowIndexOffset,
      rowVirtualizer,
      columnVirtualization,
      focusCell,
    ]
  );

  // Rows and columns are rendered once the grid knows its width: the first render has none yet,
  // unless the grid really has no width (e.g. it is hidden), then there is nothing more to wait for.
  const onRenderCompleteRef = useRef(onRenderComplete);
  onRenderCompleteRef.current = onRenderComplete;
  const hasRenderCompleteCallback = Boolean(onRenderComplete);
  useEffect(() => {
    if (!hasRenderCompleteCallback || !scrollElement) {
      return;
    }
    if (gridWidth === 0 && scrollElement.clientWidth > 0) {
      return;
    }
    // After the browser applied the measured row heights of this render.
    const frame = requestAnimationFrame(() => onRenderCompleteRef.current?.());
    return () => cancelAnimationFrame(frame);
  }, [hasRenderCompleteCallback, scrollElement, gridWidth, rows, columns]);

  // What pinned and virtualized rows have in common.
  const sharedRowProps = {
    slices,
    getCellProps,
    getRowProps,
    renderCellPopover,
    showCellPopoverCloseButton,
    styles,
    onOpenExpansion: setExpandedCell,
    onCloseExpansion: closeExpansion,
  };

  return (
    <div
      ref={setScrollRef}
      onScroll={onScroll}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      tabIndex={-1}
      role="grid"
      aria-rowcount={rows.length + (showHeader ? 1 : 0) + (hasFooter ? 1 : 0)}
      aria-colcount={columns.length}
      id={gridId}
      className={className}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      data-test-subj={dataTestSubj}
      data-cell-padding={cellPadding}
      data-font-size={fontSize}
      data-border={border}
      data-stripes={stripes}
      data-row-hover={rowHover}
      data-header={header}
      data-footer={footer}
      data-row-height={getRowHeightMode(lineCount)}
      css={styles.scrollContainer}
      style={containerStyle}
    >
      <div ref={setStickyElement} css={styles.stickyTop} style={{ inlineSize: totalWidth }}>
        {showHeader && (
          <DataGridHeaderRow
            slices={slices}
            styles={styles}
            tabStopColIndex={getTabStopColIndex(1)}
            resizingColumnId={resizingColumnId}
            sorting={sorting}
            headerRowHeight={headerRowHeight}
            onMoveColumn={onMoveColumn}
            onHideColumn={onHideColumn}
            onStartResize={startResize}
            onResetColumnWidth={resetColumnWidth}
            onStartDrag={onReorderColumn ? startDrag : undefined}
            dragState={dragState}
          />
        )}
        {pinnedRows.length > 0 && (
          <div data-test-subj={`${dataTestSubj}-pinnedRows`} css={styles.pinnedRows}>
            <OverrideCopiedTabularContent>
              {pinnedRows.map((item, index) => {
                const ariaRowIndex = index + ariaRowIndexOffset;
                return (
                  <DataGridRow
                    {...sharedRowProps}
                    key={item.id}
                    item={item}
                    expandedCell={expandedCell?.rowId === item.id ? expandedCell : undefined}
                    ariaRowIndex={ariaRowIndex}
                    isStriped={index % 2 === 1}
                    tabStopColIndex={getTabStopColIndex(ariaRowIndex)}
                  />
                );
              })}
            </OverrideCopiedTabularContent>
          </div>
        )}
      </div>
      <div
        css={styles.virtualOuter}
        style={{ height: rowVirtualizer.getTotalSize(), inlineSize: totalWidth }}
      >
        <div
          css={styles.virtualInner}
          style={{
            transform: `translateY(${
              (virtualItems[0]?.start ?? stickyHeight) - rowVirtualizer.options.scrollMargin
            }px)`,
          }}
        >
          <OverrideCopiedTabularContent>
            {virtualItems.map(({ index, key }) => {
              const item = virtualizedRows[index];
              if (!item) {
                return null;
              }
              const rowIndex = pinnedRows.length + index;
              const ariaRowIndex = rowIndex + ariaRowIndexOffset;
              return (
                <DataGridRow
                  {...sharedRowProps}
                  key={key}
                  item={item}
                  expandedCell={expandedCell?.rowId === item.id ? expandedCell : undefined}
                  ariaRowIndex={ariaRowIndex}
                  isStriped={rowIndex % 2 === 1}
                  tabStopColIndex={getTabStopColIndex(ariaRowIndex)}
                  virtualIndex={index}
                  measureElement={rowVirtualizer.measureElement}
                />
              );
            })}
          </OverrideCopiedTabularContent>
        </div>
      </div>
      {renderFooterCell && footerRow !== undefined && (
        <div ref={setFooterElement} css={styles.footerContainer} style={{ inlineSize: totalWidth }}>
          <DataGridFooterRow
            slices={slices}
            styles={styles}
            ariaRowIndex={footerRow}
            renderFooterCell={renderFooterCell}
            tabStopColIndex={getTabStopColIndex(footerRow)}
          />
        </div>
      )}
    </div>
  );
};
