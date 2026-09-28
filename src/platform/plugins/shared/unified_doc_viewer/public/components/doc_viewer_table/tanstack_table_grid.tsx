/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties, FocusEvent } from 'react';
import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Cell,
  type ColumnDef,
  type ColumnSizingState,
  type Row,
  type RowPinningState,
  type Table,
  type Updater,
} from '@tanstack/react-table';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import type { EuiDataGridColumnCellAction, UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiPopoverFooter,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  euiFontSize,
  useResizeObserver,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { getUnifiedDocViewerServices } from '../../plugin';
import type { FieldRow } from './field_row';
import { PinControlCell } from './get_pin_control';
import { TableCell } from './table_cell';
import {
  getFieldCellActions,
  getFieldValueCellActions,
  getFilterExistsDisabledWarning,
  getFilterInOutPairDisabledWarning,
} from './table_cell_actions';
import { useRestorableRef } from './table';
import type { TableGridProps } from './table_grid';
import { GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE } from './table_grid';
import { getCellPositionAfterPinToggle } from './utils';

export type TanStackTableGridProps = Omit<
  TableGridProps,
  'customRenderCellValue' | 'customRenderCellPopover' | 'gridStyle'
>;

type FieldColumnId = typeof GRID_COLUMN_FIELD_NAME | typeof GRID_COLUMN_FIELD_VALUE;
type TableStyles = ReturnType<typeof useMemoCss<typeof componentStyles>>;

const PIN_COLUMN_ID = 'pin_field';
const PIN_COLUMN_WIDTH = 32;
const MIN_NAME_COLUMN_WIDTH = 150;
const MAX_NAME_COLUMN_WIDTH = 350;
const ESTIMATED_ROW_HEIGHT = 34;
const OVERSCAN = 10;
// Column widths are applied through a CSS variable so resizing doesn't re-render rows.
const NAME_COLUMN_WIDTH_VAR = '--kbnDocViewerNameColumnWidth';

const estimateSize = () => ESTIMATED_ROW_HEIGHT;

const getInitialNameColumnWidth = (containerWidth: number) =>
  Math.min(
    Math.max(Math.round(containerWidth * 0.3), MIN_NAME_COLUMN_WIDTH),
    MAX_NAME_COLUMN_WIDTH
  );

// Lets memoized cells know whether their grid cell is hovered or focused, so the
// comparatively heavy cell actions only mount for that one cell.
const GridCellActiveContext = createContext(false);

// Mirrors the EuiDataGrid hover action button: icon only, label exposed via tooltip and aria-label.
const CellActionIconButton: typeof EuiButtonIcon = ({ children, title, ...rest }) => (
  <EuiToolTip content={title} disableScreenReaderOutput>
    <EuiButtonIcon {...rest} aria-label={title ?? ''} size="xs" iconSize="s" color="text" />
  </EuiToolTip>
);

const CellActionPopoverButton: typeof EuiButtonEmpty = (props) => (
  <EuiButtonEmpty {...props} size="s" />
);

interface FieldTableCellProps {
  rows: FieldRow[];
  rowIndex: number;
  colIndex: number;
  columnId: FieldColumnId;
  cellActions: EuiDataGridColumnCellAction[];
  searchTerm?: string;
  isEsqlMode: boolean;
  onFindSearchTermMatch?: TableGridProps['onFindSearchTermMatch'];
  filter?: TableGridProps['filter'];
  hideFilteringOnComputedColumns?: boolean;
}

const FieldTableCell = memo(
  ({
    rows,
    rowIndex,
    colIndex,
    columnId,
    cellActions,
    searchTerm,
    isEsqlMode,
    onFindSearchTermMatch,
    filter,
    hideFilteringOnComputedColumns,
  }: FieldTableCellProps) => {
    const isActive = useContext(GridCellActiveContext);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopover = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const row = rows[rowIndex];
    const warningMessage = useMemo(() => {
      if (!isPopoverOpen) {
        return undefined;
      }
      const params = { row, onFilter: filter, hideFilteringOnComputedColumns };
      return columnId === GRID_COLUMN_FIELD_VALUE
        ? getFilterInOutPairDisabledWarning(params)
        : getFilterExistsDisabledWarning(params);
    }, [isPopoverOpen, row, filter, hideFilteringOnComputedColumns, columnId]);

    const expandLabel = i18n.translate('unifiedDocViewer.fieldsTable.expandCellLabel', {
      defaultMessage: 'Expand cell',
    });

    return (
      <>
        <TableCell
          searchTerm={searchTerm || ''}
          rows={rows}
          rowIndex={rowIndex}
          columnId={columnId}
          isDetails={false}
          isESQLMode={isEsqlMode}
          onFindSearchTermMatch={onFindSearchTermMatch}
        />
        {(isActive || isPopoverOpen) && (
          <div className="kbnDocViewer__tanStackCellActions">
            {cellActions.map((Action, idx) => (
              <Action
                key={idx}
                rowIndex={rowIndex}
                colIndex={colIndex}
                columnId={columnId}
                Component={CellActionIconButton}
                isExpanded={false}
              />
            ))}
            <EuiPopover
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              anchorPosition="downRight"
              aria-label={i18n.translate('unifiedDocViewer.fieldsTable.cellPopoverAriaLabel', {
                defaultMessage: 'Cell details',
              })}
              panelPaddingSize="s"
              panelProps={{ 'data-test-subj': 'euiDataGridExpansionPopover' }}
              button={
                <EuiToolTip content={expandLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    data-test-subj="euiDataGridCellExpandButton"
                    iconType="maximize"
                    aria-label={expandLabel}
                    size="xs"
                    iconSize="s"
                    color="text"
                    onClick={togglePopover}
                  />
                </EuiToolTip>
              }
            >
              <EuiText size="s" css={popoverContentStyles}>
                <TableCell
                  searchTerm={searchTerm || ''}
                  rows={rows}
                  rowIndex={rowIndex}
                  columnId={columnId}
                  isDetails
                  isESQLMode={isEsqlMode}
                  onFindSearchTermMatch={onFindSearchTermMatch}
                />
              </EuiText>
              {cellActions.length > 0 && (
                <EuiPopoverFooter>
                  <EuiFlexGroup gutterSize="s" responsive={false} wrap>
                    {cellActions.map((Action, idx) => (
                      <EuiFlexItem key={idx} grow={false}>
                        <Action
                          rowIndex={rowIndex}
                          colIndex={colIndex}
                          columnId={columnId}
                          Component={CellActionPopoverButton}
                          isExpanded
                        />
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiPopoverFooter>
              )}
              {Boolean(warningMessage) && (
                <div>
                  <EuiSpacer size="xs" />
                  <KbnWarningCallout announceOnMount={false} title={warningMessage} size="s" />
                </div>
              )}
            </EuiPopover>
          </div>
        )}
      </>
    );
  }
);

const GridCell = memo(
  ({ cell, styles }: { cell: Cell<FieldRow, unknown>; styles: TableStyles }) => {
    const [isActive, setIsActive] = useState(false);
    const { id: columnId } = cell.column;
    const hasActions = columnId !== PIN_COLUMN_ID;

    const onActivate = useCallback(() => setIsActive(true), []);
    const onDeactivate = useCallback(() => setIsActive(false), []);
    const onBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setIsActive(false);
      }
    }, []);

    return (
      <div
        role="gridcell"
        data-gridcell-column-id={columnId}
        tabIndex={hasActions ? 0 : undefined}
        onMouseEnter={hasActions ? onActivate : undefined}
        onMouseLeave={hasActions ? onDeactivate : undefined}
        onFocus={hasActions ? onActivate : undefined}
        onBlur={hasActions ? onBlur : undefined}
        css={[styles.cell, getColumnCss(styles, columnId)]}
      >
        <GridCellActiveContext.Provider value={isActive}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </GridCellActiveContext.Provider>
      </div>
    );
  }
);

interface GridRowProps {
  row: Row<FieldRow>;
  ariaRowIndex: number;
  isStriped: boolean;
  styles: TableStyles;
  // Only used to re-render memoized rows when the column definitions change.
  columns: Array<ColumnDef<FieldRow>>;
  // Set for virtualized rows, so the virtualizer can measure their auto height.
  virtualIndex?: number;
  measureElement?: Virtualizer<HTMLDivElement, Element>['measureElement'];
}

const GridRow = memo(
  ({ row, ariaRowIndex, isStriped, styles, virtualIndex, measureElement }: GridRowProps) => (
    <div
      ref={measureElement}
      data-index={virtualIndex}
      role="row"
      aria-rowindex={ariaRowIndex}
      className="kbnDocViewer__tanStackRow"
      css={[styles.row, isStriped && styles.rowStriped]}
    >
      {row.getVisibleCells().map((cell) => (
        <GridCell key={cell.id} cell={cell} styles={styles} />
      ))}
    </div>
  )
);

const getColumnCss = (styles: TableStyles, columnId: string) => {
  if (columnId === GRID_COLUMN_FIELD_VALUE) {
    return styles.valueColumn;
  }
  return columnId === PIN_COLUMN_ID ? styles.pinColumn : styles.nameColumn;
};

/**
 * TanStack Table + Virtual based fields table, rendered as an alternative to the EuiDataGrid one.
 */
export const TanStackTableGrid = ({
  containerWidth,
  rows,
  isEsqlMode,
  filter,
  onAddColumn,
  onRemoveColumn,
  columns,
  onFindSearchTermMatch,
  searchTerm,
  onTogglePinned,
  hidePinColumn = false,
  headerVisibility = true,
  hideFilteringOnComputedColumns,
}: TanStackTableGridProps) => {
  const styles = useMemoCss(componentStyles);
  const { toasts } = getUnifiedDocViewerServices();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRestorableRef('scrollTop', 0);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const tableRef = useRef<Table<FieldRow>>();
  const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element>>();

  // Header and pinned rows share one sticky block, which the virtualized rows scroll below.
  const [stickyElement, setStickyElement] = useState<HTMLDivElement | null>(null);
  const { height: stickyHeight } = useResizeObserver(stickyElement, 'height');

  const onToggleColumn = useMemo(() => {
    if (!onRemoveColumn || !onAddColumn || !columns) {
      return undefined;
    }
    return (field: string) => {
      if (columns.includes(field)) {
        onRemoveColumn(field);
      } else {
        onAddColumn(field);
      }
    };
  }, [onRemoveColumn, onAddColumn, columns]);

  const fieldCellActions = useMemo(
    () =>
      getFieldCellActions({
        rows,
        isEsqlMode,
        onFilter: filter,
        onToggleColumn,
        columns,
        hideFilteringOnComputedColumns,
      }),
    [rows, isEsqlMode, filter, onToggleColumn, columns, hideFilteringOnComputedColumns]
  );
  const fieldValueCellActions = useMemo(
    () =>
      getFieldValueCellActions({
        rows,
        isEsqlMode,
        toasts,
        onFilter: filter,
        hideFilteringOnComputedColumns,
      }),
    [rows, isEsqlMode, toasts, filter, hideFilteringOnComputedColumns]
  );

  const showPinColumn = Boolean(onTogglePinned) && !hidePinColumn;

  // Pinned fields are owned by the parent (restorable + local storage), TanStack row pinning mirrors them.
  const rowPinning = useMemo<RowPinningState>(
    () => ({ top: rows.filter((row) => row.isPinned).map((row) => row.name), bottom: [] }),
    [rows]
  );

  const onRowPinningChange = useCallback(
    (updater: Updater<RowPinningState>) => {
      const prevTop = rowPinning.top ?? [];
      const nextTop = (typeof updater === 'function' ? updater(rowPinning) : updater).top ?? [];
      const toggledFields = [
        ...nextTop.filter((field) => !prevTop.includes(field)),
        ...prevTop.filter((field) => !nextTop.includes(field)),
      ];
      toggledFields.forEach((field) => onTogglePinned?.(field));
    },
    [rowPinning, onTogglePinned]
  );

  const handleTogglePinned = useCallback(
    (field: string, { isKeyboardEvent }: { isKeyboardEvent: boolean }) => {
      const tableRow = tableRef.current?.getRow(field, true);
      if (!tableRow) {
        return;
      }
      const isPinning = !tableRow.getIsPinned();
      tableRow.pin(isPinning ? 'top' : false);

      if (!isKeyboardEvent) {
        return;
      }

      // Keep keyboard focus on the toggled field. Pinned rows are always visible in the sticky
      // section, an unpinned row moves back into the virtualized rows and may need scrolling to.
      if (!isPinning) {
        const pinnedRows = rows.filter((row) => row.isPinned);
        const restRows = rows.filter((row) => !row.isPinned);
        const centerIndex =
          getCellPositionAfterPinToggle({ field, pinnedRows, restRows }) - (pinnedRows.length - 1);
        if (centerIndex >= 0) {
          virtualizerRef.current?.scrollToIndex(centerIndex);
        }
      }
      requestAnimationFrame(() => {
        scrollRef.current
          ?.querySelector<HTMLElement>(
            `[data-test-subj="unifiedDocViewer_pinControlButton_${CSS.escape(field)}"]`
          )
          ?.focus();
      });
    },
    [rows]
  );

  const tableColumns = useMemo<Array<ColumnDef<FieldRow>>>(() => {
    const renderFieldCell =
      (columnId: FieldColumnId, colIndex: number, cellActions: EuiDataGridColumnCellAction[]) =>
      ({ row }: { row: { index: number } }) =>
        (
          <FieldTableCell
            rows={rows}
            rowIndex={row.index}
            colIndex={colIndex}
            columnId={columnId}
            cellActions={cellActions}
            searchTerm={searchTerm}
            isEsqlMode={isEsqlMode}
            onFindSearchTermMatch={onFindSearchTermMatch}
            filter={filter}
            hideFilteringOnComputedColumns={hideFilteringOnComputedColumns}
          />
        );
    const colOffset = showPinColumn ? 1 : 0;

    return [
      ...(showPinColumn
        ? [
            {
              id: PIN_COLUMN_ID,
              size: PIN_COLUMN_WIDTH,
              enableResizing: false,
              header: () => {
                const pinColumnHeader = i18n.translate(
                  'unifiedDocViewer.fieldsTable.pinControlColumnHeader',
                  { defaultMessage: 'Pin field column' }
                );
                return (
                  <EuiIconTip aria-label={pinColumnHeader} type="info" content={pinColumnHeader} />
                );
              },
              cell: ({ row }: { row: { original: FieldRow } }) => (
                <PinControlCell row={row.original} onTogglePinned={handleTogglePinned} />
              ),
            },
          ]
        : []),
      {
        id: GRID_COLUMN_FIELD_NAME,
        minSize: MIN_NAME_COLUMN_WIDTH,
        header: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.name', {
          defaultMessage: 'Field',
        }),
        cell: renderFieldCell(GRID_COLUMN_FIELD_NAME, colOffset, fieldCellActions),
      },
      {
        id: GRID_COLUMN_FIELD_VALUE,
        enableResizing: false,
        header: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.value', {
          defaultMessage: 'Value',
        }),
        cell: renderFieldCell(GRID_COLUMN_FIELD_VALUE, colOffset + 1, fieldValueCellActions),
      },
    ];
  }, [
    rows,
    searchTerm,
    isEsqlMode,
    onFindSearchTermMatch,
    filter,
    hideFilteringOnComputedColumns,
    showPinColumn,
    handleTogglePinned,
    fieldCellActions,
    fieldValueCellActions,
  ]);

  // The name column follows the container width until the user resizes it.
  const tableColumnSizing = useMemo<ColumnSizingState>(
    () => ({
      [GRID_COLUMN_FIELD_NAME]: getInitialNameColumnWidth(containerWidth),
      ...columnSizing,
    }),
    [containerWidth, columnSizing]
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.name,
    columnResizeMode: 'onChange',
    enableRowPinning: showPinColumn,
    // Pinned fields are never filtered out by the fields search, see `DocViewerTable`.
    keepPinnedRows: true,
    state: { columnSizing: tableColumnSizing, rowPinning },
    onColumnSizingChange: setColumnSizing,
    onRowPinningChange,
  });
  tableRef.current = table;

  const topRows = table.getTopRows();
  const centerRows = table.getCenterRows();

  // Must be stable: a new function makes the virtualizer rebuild all row measurements.
  const getItemKey = useCallback((index: number) => centerRows[index]?.id ?? index, [centerRows]);

  const rowVirtualizer = useVirtualizer({
    count: centerRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: OVERSCAN,
    initialOffset: scrollTopRef.current,
    getItemKey,
    scrollMargin: stickyHeight,
    scrollPaddingStart: stickyHeight,
  });
  virtualizerRef.current = rowVirtualizer;

  const onScroll = useCallback(() => {
    if (scrollRef.current) {
      scrollTopRef.current = scrollRef.current.scrollTop;
    }
  }, [scrollTopRef]);

  const nameColumnWidth = tableColumnSizing[GRID_COLUMN_FIELD_NAME];
  const containerStyle = useMemo(
    // CSS custom properties are not part of React's CSSProperties type.
    () => ({ [NAME_COLUMN_WIDTH_VAR]: `${nameColumnWidth}px` } as CSSProperties),
    [nameColumnWidth]
  );

  const virtualItems = rowVirtualizer.getVirtualItems();
  const ariaRowIndexOffset = headerVisibility ? 2 : 1;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      role="grid"
      aria-rowcount={rows.length + (headerVisibility ? 1 : 0)}
      aria-colcount={tableColumns.length}
      aria-label={i18n.translate('unifiedDocViewer.fieldsTable.ariaLabel', {
        defaultMessage: 'Field values',
      })}
      data-test-subj="UnifiedDocViewerTableGrid"
      className="kbnDocViewer__fieldsGrid"
      css={styles.scrollContainer}
      style={containerStyle}
    >
      <div ref={setStickyElement} css={styles.stickyTop}>
        {headerVisibility &&
          table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} role="row" css={styles.headerRow}>
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  role="columnheader"
                  data-gridcell-column-id={header.column.id}
                  css={[styles.headerCell, getColumnCss(styles, header.column.id)]}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanResize() && (
                    <div
                      role="presentation"
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      onDoubleClick={() => header.column.resetSize()}
                      css={[
                        styles.resizeHandle,
                        header.column.getIsResizing() && styles.resizeHandleActive,
                      ]}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        {topRows.length > 0 && (
          <div data-test-subj="unifiedDocViewerPinnedFields" css={styles.pinnedRows}>
            {topRows.map((tableRow, index) => (
              <GridRow
                key={tableRow.id}
                row={tableRow}
                ariaRowIndex={index + ariaRowIndexOffset}
                isStriped={index % 2 === 1}
                styles={styles}
                columns={tableColumns}
              />
            ))}
          </div>
        )}
      </div>
      <div css={styles.virtualOuter} style={{ height: rowVirtualizer.getTotalSize() }}>
        <div
          css={styles.virtualInner}
          style={{
            transform: `translateY(${
              (virtualItems[0]?.start ?? stickyHeight) - rowVirtualizer.options.scrollMargin
            }px)`,
          }}
        >
          {virtualItems.map(({ index, key }) => {
            const tableRow = centerRows[index];
            if (!tableRow) {
              return null;
            }
            const rowIndex = topRows.length + index;
            return (
              <GridRow
                key={key}
                row={tableRow}
                ariaRowIndex={rowIndex + ariaRowIndexOffset}
                isStriped={rowIndex % 2 === 1}
                styles={styles}
                columns={tableColumns}
                virtualIndex={index}
                measureElement={rowVirtualizer.measureElement}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const popoverContentStyles = css({
  maxInlineSize: 'min(75vw, 600px)',
  maxBlockSize: '50vh',
  overflow: 'auto',
  wordBreak: 'break-word',
});

const componentStyles = {
  scrollContainer: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    const { fontSize } = euiFontSize(themeContext, 's');
    const fieldNameTopPadding = `calc(${euiTheme.size.xs} * 1.5)`;

    return css({
      position: 'relative',
      blockSize: '100%',
      // Keeps rendering virtualized even if the parent doesn't constrain the height.
      maxBlockSize: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      fontSize,

      '.kbnDocViewer__fieldName': {
        paddingTop: fieldNameTopPadding,
        paddingLeft: 0,
        lineHeight: euiTheme.font.lineHeightMultiplier,
      },

      '.kbnDocViewer__fieldName_icon': {
        paddingTop: fieldNameTopPadding,
        lineHeight: euiTheme.font.lineHeightMultiplier,
      },

      '.kbnDocViewer__fieldName_multiFieldBadge': {
        margin: `${euiTheme.size.xs} 0`,
        fontWeight: euiTheme.font.weight.regular,
        fontFamily: euiTheme.font.family,
      },

      '.kbnDocViewer__fieldsGrid__pinAction': {
        opacity: 0,
      },

      '.kbnDocViewer__tanStackRow:hover .kbnDocViewer__fieldsGrid__pinAction, [data-gridcell-column-id="pin_field"]:focus-within .kbnDocViewer__fieldsGrid__pinAction':
        {
          opacity: 1,
        },

      '.kbnDocViewer__tanStackCellActions': {
        position: 'absolute',
        top: euiTheme.size.xs,
        right: euiTheme.size.xs,
        display: 'flex',
        alignItems: 'center',
        gap: euiTheme.size.xxs,
        paddingInline: euiTheme.size.xxs,
        borderRadius: euiTheme.border.radius.small,
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        boxShadow: `0 0 0 ${euiTheme.border.width.thin} ${euiTheme.colors.borderBasePlain}`,
        zIndex: 1,
      },
    });
  },
  stickyTop: css({
    position: 'sticky',
    top: 0,
    zIndex: 2,
  }),
  headerRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      backgroundColor: euiTheme.components.dataGridRowBackground,
      borderBottom: euiTheme.border.thin,
      fontWeight: euiTheme.font.weight.bold,
    }),
  headerCell: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      boxSizing: 'border-box',
      minBlockSize: euiTheme.size.xl,
      padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    }),
  resizeHandle: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: euiTheme.size.s,
      cursor: 'col-resize',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '&::after': {
        content: '""',
        width: euiTheme.size.xxs,
        height: '60%',
        borderRadius: euiTheme.size.xs,
        backgroundColor: 'transparent',
      },
      '&:hover::after': {
        backgroundColor: euiTheme.colors.borderBasePlain,
      },
    }),
  resizeHandleActive: ({ euiTheme }: UseEuiTheme) =>
    css({
      '&::after': {
        backgroundColor: euiTheme.colors.borderBasePlain,
      },
    }),
  // Keeps many pinned fields from taking over the whole table.
  pinnedRows: ({ euiTheme }: UseEuiTheme) =>
    css({
      maxBlockSize: '40vh',
      overflowY: 'auto',
      borderBottom: `${euiTheme.border.width.thick} solid ${euiTheme.colors.borderBasePlain}`,
    }),
  virtualOuter: css({
    position: 'relative',
    inlineSize: '100%',
  }),
  virtualInner: css({
    position: 'absolute',
    top: 0,
    left: 0,
    inlineSize: '100%',
  }),
  row: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      backgroundColor: euiTheme.components.dataGridRowBackground,
      borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.components.dataGridBorderColor}`,
      '&:hover': {
        backgroundColor: euiTheme.components.dataGridRowBackgroundHover,
      },
    }),
  rowStriped: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStriped,
      '&:hover': {
        backgroundColor: euiTheme.components.dataGridRowStripesBackgroundStripedHover,
      },
    }),
  cell: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      boxSizing: 'border-box',
      minWidth: 0,
      padding: euiTheme.size.s,
      overflowWrap: 'break-word',
      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.colors.primary}`,
        outlineOffset: `calc(-1 * ${euiTheme.focus.width})`,
      },
      '&[data-gridcell-column-id="name"]': {
        paddingBlock: 0,
      },
      '&[data-gridcell-column-id="pin_field"]': {
        padding: `calc(${euiTheme.size.xs} / 2) 0 0 ${euiTheme.size.xs}`,
      },
    }),
  pinColumn: css({
    width: PIN_COLUMN_WIDTH,
    flexShrink: 0,
  }),
  nameColumn: css({
    width: `var(${NAME_COLUMN_WIDTH_VAR})`,
    flexShrink: 0,
  }),
  valueColumn: css({
    flex: '1 1 0',
    minWidth: 0,
  }),
};
