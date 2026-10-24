/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, ForwardedRef, KeyboardEvent, ReactNode } from 'react';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  EuiDataGridCellPopoverElementProps,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridColumnCellAction,
  EuiDataGridControlColumn,
  EuiDataGridProps,
  EuiDataGridRefProps,
  EuiDataGridStyle,
  EuiDataGridToolBarAdditionalControlsOptions,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiText, keys, mathWithUnits, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { isEqual } from 'lodash';
import { DataGrid } from '../components/data_grid';
import { DataGridPagination } from '../toolbar/pagination';
import { ColumnSelector } from '../toolbar/column_selector';
import { DisplaySelector } from '../toolbar/display_selector';
import { FullScreenSelector } from '../toolbar/full_screen_selector';
import { KeyboardShortcuts } from '../toolbar/keyboard_shortcuts';
import { SortSelector } from '../toolbar/sort_selector';
import { popoverContentStyles } from '../styles';
import { GRID_CELL_SELECTOR } from '../utils/grid_navigation';
import type {
  DataGridCellPopoverProps,
  DataGridColumn,
  DataGridControlColumn,
  DataGridDensity,
  DataGridHeaderActionItem,
  DataGridProps,
  DataGridRef,
  DataGridRowHeight,
  DataGridStyle,
} from '../types';

/** The props of `EuiDataGrid` the adapter supports. The rest is ignored. */
type SupportedEuiDataGridProps = Pick<
  EuiDataGridProps,
  | 'id'
  | 'className'
  | 'data-test-subj'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'columns'
  | 'columnVisibility'
  | 'leadingControlColumns'
  | 'trailingControlColumns'
  | 'rowCount'
  | 'renderCellValue'
  | 'cellContext'
  | 'renderCellPopover'
  | 'sorting'
  | 'pagination'
  | 'toolbarVisibility'
  | 'renderCustomToolbar'
  | 'rowHeightsOptions'
  | 'gridStyle'
  | 'virtualizationOptions'
  | 'onFullScreenChange'
  | 'renderFooterCellValue'
>;

export type EuiDataGridAdapterProps = SupportedEuiDataGridProps & {
  /**
   * Like the one of `EuiDataGrid`, but called with `width: undefined` when the user resets a column
   * (double click on its resize handle), so a consumer that stores the widths can drop it.
   */
  onColumnResize?: DataGridProps<number>['onColumnResize'];
  /** Number of columns, after the leading control columns, that stay in view while the rest scrolls. */
  stickyColumnCount?: number;
  /**
   * Called once the grid rendered its rows, and again when they change. `EuiDataGrid` has no such
   * callback, consumers guess with a timeout instead.
   */
  onRenderComplete?: () => void;
};

/** Everything of the ref of `EuiDataGrid` but `scrollTo`. */
export type EuiDataGridAdapterRef = EuiDataGridRefProps;

const DENSITY_STYLES: Record<
  DataGridDensity,
  Pick<EuiDataGridStyle, 'fontSize' | 'cellPadding'>
> = {
  compact: { fontSize: 's', cellPadding: 's' },
  normal: { fontSize: 'm', cellPadding: 'm' },
  expanded: { fontSize: 'l', cellPadding: 'l' },
};

const getDensity = ({ fontSize, cellPadding }: EuiDataGridStyle): DataGridDensity => {
  if (fontSize === 's' && cellPadding === 's') {
    return 'compact';
  }
  if (fontSize === 'm' && cellPadding === 'm') {
    return 'normal';
  }
  return 'expanded';
};

// Like EuiDataGrid, rows show a single line of text unless told otherwise.
const getRowHeight = (
  defaultHeight: NonNullable<EuiDataGridProps['rowHeightsOptions']>['defaultHeight']
): DataGridRowHeight => {
  if (defaultHeight === undefined) {
    return { lineCount: 1 };
  }
  return typeof defaultHeight === 'object' && defaultHeight.lineCount !== undefined
    ? { lineCount: defaultHeight.lineCount }
    : 'auto';
};

// The defaults of EuiDataGrid's `gridStyle`.
const EUI_DEFAULT_GRID_STYLE: Required<DataGridStyle> = {
  cellPadding: 'm',
  fontSize: 'm',
  border: 'all',
  stripes: false,
  rowHover: 'highlight',
  header: 'shade',
  footer: 'overline',
};

// Below this width the toolbar only shows the controls on its right, like EuiDataGrid.
const MIN_WIDTH_FOR_GRID_CONTROLS = 479;
// Rows rendered beyond the visible ones when `virtualizationOptions` says nothing, EuiDataGrid renders
// few: consumers that want more, e.g. for cheap rows, ask for it.
const EUI_DEFAULT_OVERSCAN = 2;

/**
 * A render function or a component of `EuiDataGrid`, which cells render as a component. Like
 * `EuiDataGrid`, it also gets `visibleRowIndex`, the index of the row in the page, which its types
 * leave out.
 */
type CellValueComponent = ComponentType<
  EuiDataGridCellValueElementProps & { visibleRowIndex: number }
>;

type CellRenderer = DataGridColumn<number>['renderCell'];

interface PopoverBridgeProps extends DataGridCellPopoverProps<number> {
  PopoverRenderer: ComponentType<EuiDataGridCellPopoverElementProps>;
  schema?: string;
  /** Index in all rows of the first row of the page. */
  pageStart: number;
}

/** Like the default popover of `EuiDataGrid`: the content and the actions it is given. */
const DefaultCellPopover = ({ children, cellActions }: EuiDataGridCellPopoverElementProps) => (
  <>
    <EuiText size="s" css={popoverContentStyles}>
      {children}
    </EuiText>
    {cellActions}
  </>
);

/**
 * Gives the popover renderer of `EuiDataGrid` its props. `setCellPopoverProps` has to keep its identity:
 * renderers call it from an effect that depends on it.
 */
const PopoverBridge = ({
  PopoverRenderer,
  schema,
  pageStart,
  rowIndex,
  colIndex,
  columnId,
  children,
  cellActions,
  cellContentElement,
  setPopoverProps,
}: PopoverBridgeProps) => {
  const setCellPopoverProps = useCallback<
    EuiDataGridCellPopoverElementProps['setCellPopoverProps']
  >(
    ({ panelClassName, panelProps }) => setPopoverProps({ panelClassName, panelProps }),
    [setPopoverProps]
  );

  return (
    <PopoverRenderer
      rowIndex={pageStart + rowIndex}
      colIndex={colIndex}
      columnId={columnId}
      schema={schema}
      cellContentsElement={cellContentElement as HTMLDivElement}
      cellActions={cellActions}
      DefaultCellPopover={DefaultCellPopover}
      setCellPopoverProps={setCellPopoverProps}
    >
      {children}
    </PopoverRenderer>
  );
};

/** `EuiDataGrid` tells the actions the index in all rows, the grid the one in the page. */
const noop = () => {};

const getCellActionForPage = (Action: EuiDataGridColumnCellAction, pageStart: number) => {
  const CellActionForPage: EuiDataGridColumnCellAction = (props) => (
    <Action {...props} rowIndex={pageStart + props.rowIndex} />
  );
  return CellActionForPage;
};

const toGridColumn = (
  column: EuiDataGridColumn,
  {
    getRenderCell,
    getCellActions,
    sorting,
    onMoveColumn,
  }: {
    /** Functions that keep their identity while what they render with is the same. */
    getRenderCell: (columnId: string) => DataGridColumn<number>['renderCell'];
    getCellActions: (
      columnId: string,
      cellActions: EuiDataGridColumnCellAction[] | undefined
    ) => EuiDataGridColumnCellAction[] | undefined;
    sorting: boolean;
    onMoveColumn: boolean;
  }
): DataGridColumn<number> => {
  const { id, display, displayAsText, schema, actions, cellActions, visibleCellActions } = column;
  const isActionShown = (action: boolean | object | undefined) => action !== false;
  const getActionLabel = (action: boolean | { label?: ReactNode } | undefined) =>
    typeof action === 'object' ? action.label : undefined;

  return {
    id,
    header: display ?? displayAsText ?? id,
    displayAsText,
    schema,
    isSortable: sorting && column.isSortable !== false,
    isResizable: column.isResizable !== false,
    isExpandable: column.isExpandable,
    initialWidth: column.initialWidth,
    cellActions: getCellActions(id, cellActions),
    visibleCellActions,
    actions:
      actions === false
        ? false
        : {
            showSortAsc: isActionShown(actions?.showSortAsc),
            showSortDesc: isActionShown(actions?.showSortDesc),
            sortLabels: {
              asc: getActionLabel(actions?.showSortAsc),
              desc: getActionLabel(actions?.showSortDesc),
            },
            showMoveLeft: onMoveColumn && isActionShown(actions?.showMoveLeft),
            showMoveRight: onMoveColumn && isActionShown(actions?.showMoveRight),
            showHide: actions?.showHide
              ? {
                  label: typeof actions.showHide === 'object' ? actions.showHide.label : undefined,
                  'data-test-subj':
                    typeof actions.showHide === 'object'
                      ? actions.showHide['data-test-subj']
                      : undefined,
                }
              : false,
            additional: (actions?.additional ?? []).map(
              (
                { label, iconType, onClick, isDisabled, ...rest },
                index
              ): DataGridHeaderActionItem => ({
                id: `${index}-${typeof label === 'string' ? label : 'action'}`,
                label,
                iconType: typeof iconType === 'string' ? iconType : undefined,
                onClick: (event) => onClick?.(event),
                isDisabled,
                'data-test-subj': rest['data-test-subj'],
              })
            ),
          },
    renderCell: getRenderCell(id),
  };
};

const toControlColumn = (
  {
    id,
    width,
    headerCellRender: HeaderCell,
    headerCellProps,
    rowCellRender,
  }: EuiDataGridControlColumn,
  /** The padding of cells on each side: EuiDataGrid adds it to the width of a control column. */
  cellPaddingPx: number,
  getRenderControlCell: (
    columnId: string,
    RowCell: CellValueComponent
  ) => DataGridControlColumn<number>['renderCell']
): DataGridControlColumn<number> => ({
  id,
  width: width + cellPaddingPx * 2,
  header: <HeaderCell />,
  headerAriaLabel: headerCellProps?.['aria-label'],
  renderCell: getRenderControlCell(id, rowCellRender as CellValueComponent),
});

const isAdditionalControlsOptions = (
  controls: ReactNode | EuiDataGridToolBarAdditionalControlsOptions
): controls is EuiDataGridToolBarAdditionalControlsOptions =>
  typeof controls === 'object' && controls !== null && ('left' in controls || 'right' in controls);

const getLeftControls = (left: EuiDataGridToolBarAdditionalControlsOptions['left']): ReactNode => {
  if (typeof left === 'object' && left !== null && ('prepend' in left || 'append' in left)) {
    return (
      <>
        {left.prepend}
        {left.append}
      </>
    );
  }
  return left as ReactNode;
};

const fullScreenStyles = ({ euiTheme }: ReturnType<typeof useEuiTheme>) =>
  css({
    position: 'fixed',
    inset: 0,
    zIndex: Number(euiTheme.levels.header) + 1,
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    paddingBlockEnd: euiTheme.size.s,
  });

const rootStyles = css({ display: 'flex', flexDirection: 'column', blockSize: '100%' });
// Fills the height it is given, like EuiDataGrid, and grows with the rows where it is given none (e.g.
// in an accordion): a basis of 0 would leave no room for the rows to render in.
const gridAreaStyles = css({ flex: '1 1 auto', minBlockSize: 0 });

/**
 * Renders the props of an `EuiDataGrid` with the `DataGrid` and the toolbar of this package, so a
 * table can move off `EuiDataGrid` without changing how it describes its columns and cells.
 *
 * Supports: columns (display, width, sorting, header actions, cell actions), leading and trailing
 * control columns, `renderCellValue` (and `cellContext`), `renderCellPopover`, sorting, pagination,
 * `gridStyle` (density), `rowHeightsOptions`, the toolbar (also a custom one), full screen, dragging
 * headers to reorder the columns (`columnVisibility.canDragAndDropColumns`), the imperative methods,
 * the footer row (`renderFooterCellValue`) and a render-complete callback (`onRenderComplete`).
 * Not supported: in-memory sorting and pagination, `renderCustomGridBody`.
 */
export const EuiDataGridAdapter = forwardRef(
  (
    {
      id,
      className,
      'data-test-subj': dataTestSubj,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      columns,
      columnVisibility,
      leadingControlColumns,
      trailingControlColumns,
      rowCount,
      renderCellValue,
      cellContext,
      renderCellPopover,
      sorting,
      pagination,
      toolbarVisibility = true,
      renderCustomToolbar,
      rowHeightsOptions,
      gridStyle,
      onColumnResize,
      virtualizationOptions,
      onFullScreenChange,
      stickyColumnCount,
      renderFooterCellValue,
      onRenderComplete,
    }: EuiDataGridAdapterProps,
    ref: ForwardedRef<EuiDataGridAdapterRef>
  ) => {
    const euiThemeContext = useEuiTheme();
    const gridRef = useRef<DataGridRef>(null);
    const { visibleColumns, setVisibleColumns, canDragAndDropColumns } = columnVisibility;

    /**
     * Rows: a row is its index, the page shows a slice of them.
     */
    const pageStart = pagination ? pagination.pageIndex * (pagination.pageSize ?? rowCount) : 0;
    const pageEnd = pagination
      ? Math.min(pageStart + (pagination.pageSize ?? rowCount), rowCount)
      : rowCount;
    const rows = useMemo(
      () =>
        Array.from({ length: Math.max(pageEnd - pageStart, 0) }, (_, index) => pageStart + index),
      [pageStart, pageEnd]
    );

    /**
     * Columns
     */
    const columnsById = useMemo(
      () => new Map(columns.map((column) => [column.id, column])),
      [columns]
    );
    const orderedColumns = useMemo(
      () =>
        visibleColumns
          .map((columnId) => columnsById.get(columnId))
          .filter((column): column is EuiDataGridColumn => column !== undefined),
      [visibleColumns, columnsById]
    );

    const moveColumn = useCallback(
      ({ columnId, direction }: { columnId: string; direction: 'left' | 'right' }) => {
        const index = visibleColumns.indexOf(columnId);
        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        if (index < 0 || targetIndex < 0 || targetIndex >= visibleColumns.length) {
          return;
        }
        const next = [...visibleColumns];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        setVisibleColumns(next);
      },
      [visibleColumns, setVisibleColumns]
    );
    // `toIndex` counts the columns that are shown: an id in `visibleColumns` without a column stays.
    const reorderColumn = useCallback(
      ({ columnId, toIndex }: { columnId: string; toIndex: number }) => {
        const shownIds = orderedColumns
          .map(({ id: shownId }) => shownId)
          .filter((shownId) => shownId !== columnId);
        const beforeId = shownIds[toIndex];
        const next = visibleColumns.filter((visibleId) => visibleId !== columnId);
        const insertAt = beforeId === undefined ? next.length : next.indexOf(beforeId);
        next.splice(insertAt, 0, columnId);
        setVisibleColumns(next);
      },
      [orderedColumns, visibleColumns, setVisibleColumns]
    );
    const hideColumn = useCallback(
      (columnId: string) =>
        setVisibleColumns(visibleColumns.filter((visibleId) => visibleId !== columnId)),
      [visibleColumns, setVisibleColumns]
    );

    // Column widths: the grid keeps what the user dragged, until the column gets a new initial width.
    const computedInitialWidths = useMemo(() => {
      const widths: Record<string, number> = {};
      columns.forEach(({ id: columnId, initialWidth }) => {
        if (initialWidth !== undefined) {
          widths[columnId] = initialWidth;
        }
      });
      return widths;
    }, [columns]);
    // Rebuilt columns often have the same widths: only a real change resets what the user dragged.
    const initialWidthsRef = useRef(computedInitialWidths);
    if (!isEqual(initialWidthsRef.current, computedInitialWidths)) {
      initialWidthsRef.current = computedInitialWidths;
    }
    const initialWidths = initialWidthsRef.current;
    const [resizedWidths, setResizedWidths] = useState<Record<string, number>>({});
    useEffect(() => {
      // The consumer set (or reset) a width, e.g. because it stores them.
      setResizedWidths((prev) => (Object.keys(prev).length ? {} : prev));
    }, [initialWidths]);
    const columnWidths = useMemo(
      () => ({ ...initialWidths, ...resizedWidths }),
      [initialWidths, resizedWidths]
    );
    const onResize = useCallback<NonNullable<DataGridProps<number>['onColumnResize']>>(
      ({ columnId, width }) => {
        setResizedWidths((prev) => {
          const { [columnId]: _dropped, ...rest } = prev;
          return width === undefined ? rest : { ...rest, [columnId]: width };
        });
        onColumnResize?.({ columnId, width });
      },
      [onColumnResize]
    );

    const onEuiScroll = virtualizationOptions?.onScroll;
    const onScroll = useMemo<DataGridProps<number>['onScroll']>(
      () =>
        onEuiScroll
          ? ({ scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth }) =>
              onEuiScroll({
                scrollTop,
                scrollLeft,
                scrollHeight,
                scrollWidth,
                clientHeight,
                clientWidth,
                horizontalScrollDirection: 'forward',
                verticalScrollDirection: 'forward',
                scrollUpdateWasRequested: false,
                isScrolledToBlockStart: scrollTop <= 0,
                isScrolledToBlockEnd: scrollTop + clientHeight >= scrollHeight,
                isScrolledToInlineStart: scrollLeft <= 0,
                isScrolledToInlineEnd: scrollLeft + clientWidth >= scrollWidth,
              })
          : undefined,
      [onEuiScroll]
    );

    const CellValue = renderCellValue as CellValueComponent;
    // The consumer builds its columns anew for a sort or a width. What a cell renders with does not
    // change then, so keep the functions of the cells and their actions: the cells render again only
    // if these change.
    const cellRenderers = useRef(
      new Map<string, { CellValue: CellValueComponent; context: unknown; render: CellRenderer }>()
    );
    const getRenderCell = useCallback(
      (columnId: string): CellRenderer => {
        const cached = cellRenderers.current.get(columnId);
        if (cached && cached.CellValue === CellValue && cached.context === cellContext) {
          return cached.render;
        }
        // Like EuiDataGrid, cells also get the index of their row in the page.
        const render: CellRenderer = ({
          row,
          rowIndex,
          colIndex,
          setCellProps,
          isExpandable,
          isExpanded,
          isDetails,
        }) => (
          <CellValue
            {...cellContext}
            rowIndex={row}
            visibleRowIndex={rowIndex}
            colIndex={colIndex}
            columnId={columnId}
            setCellProps={setCellProps}
            isExpandable={isExpandable}
            isExpanded={isExpanded}
            isDetails={isDetails}
          />
        );
        cellRenderers.current.set(columnId, { CellValue, context: cellContext, render });
        return render;
      },
      [CellValue, cellContext]
    );
    const actionWrappers = useRef(
      new WeakMap<
        EuiDataGridColumnCellAction,
        { pageStart: number; Wrapper: EuiDataGridColumnCellAction }
      >()
    );
    const actionLists = useRef(new Map<string, EuiDataGridColumnCellAction[]>());
    const getCellActions = useCallback(
      (columnId: string, actions: EuiDataGridColumnCellAction[] | undefined) => {
        if (!actions) {
          actionLists.current.delete(columnId);
          return undefined;
        }
        const wrapped = actions.map((Action) => {
          const cached = actionWrappers.current.get(Action);
          if (cached && cached.pageStart === pageStart) {
            return cached.Wrapper;
          }
          const Wrapper = getCellActionForPage(Action, pageStart);
          actionWrappers.current.set(Action, { pageStart, Wrapper });
          return Wrapper;
        });
        const previous = actionLists.current.get(columnId);
        if (
          previous &&
          previous.length === wrapped.length &&
          previous.every((Wrapper, index) => Wrapper === wrapped[index])
        ) {
          return previous;
        }
        actionLists.current.set(columnId, wrapped);
        return wrapped;
      },
      [pageStart]
    );
    const gridColumns = useMemo(
      () =>
        orderedColumns.map((column) =>
          toGridColumn(column, {
            getRenderCell,
            getCellActions,
            sorting: Boolean(sorting),
            onMoveColumn: true,
          })
        ),
      [orderedColumns, getRenderCell, getCellActions, sorting]
    );
    const controlRenderers = useRef(
      new Map<
        string,
        {
          RowCell: CellValueComponent;
          context: unknown;
          render: DataGridControlColumn<number>['renderCell'];
        }
      >()
    );
    const getRenderControlCell = useCallback(
      (columnId: string, RowCell: CellValueComponent) => {
        const cached = controlRenderers.current.get(columnId);
        if (cached && cached.RowCell === RowCell && cached.context === cellContext) {
          return cached.render;
        }
        const render: DataGridControlColumn<number>['renderCell'] = ({
          row,
          rowIndex,
          colIndex,
          setCellProps,
        }) => (
          <RowCell
            {...cellContext}
            rowIndex={row}
            visibleRowIndex={rowIndex}
            colIndex={colIndex}
            columnId={columnId}
            setCellProps={setCellProps}
            isExpandable={false}
            isExpanded={false}
            isDetails={false}
          />
        );
        controlRenderers.current.set(columnId, { RowCell, context: cellContext, render });
        return render;
      },
      [cellContext]
    );
    const { euiTheme } = euiThemeContext;
    const cellPaddingPx = parseFloat(
      {
        s: euiTheme.size.xs,
        m: mathWithUnits(euiTheme.size.m, (size) => size / 2),
        l: euiTheme.size.s,
      }[gridStyle?.cellPadding ?? 'm']
    );
    const leadingColumns = useMemo(
      () =>
        (leadingControlColumns ?? []).map((column) =>
          toControlColumn(column, cellPaddingPx, getRenderControlCell)
        ),
      [leadingControlColumns, cellPaddingPx, getRenderControlCell]
    );
    const trailingColumns = useMemo(
      () =>
        (trailingControlColumns ?? []).map((column) =>
          toControlColumn(column, cellPaddingPx, getRenderControlCell)
        ),
      [trailingControlColumns, cellPaddingPx, getRenderControlCell]
    );

    /**
     * Footer: like EuiDataGrid, a row of `renderFooterCellValue`, with the `footerCellRender` of the
     * control columns.
     */
    const FooterCellValue = renderFooterCellValue as CellValueComponent | undefined;
    const controlFooters = useMemo(
      () =>
        new Map(
          [...(leadingControlColumns ?? []), ...(trailingControlColumns ?? [])].map(
            ({ id: columnId, footerCellRender }) => [
              columnId,
              footerCellRender as CellValueComponent | undefined,
            ]
          )
        ),
      [leadingControlColumns, trailingControlColumns]
    );
    const renderFooterCell = useMemo<DataGridProps<number>['renderFooterCell']>(
      () =>
        FooterCellValue
          ? ({ columnId, colIndex, isControl }) => {
              const FooterCell = isControl ? controlFooters.get(columnId) : FooterCellValue;
              return FooterCell ? (
                <FooterCell
                  {...cellContext}
                  rowIndex={rowCount}
                  visibleRowIndex={rows.length}
                  colIndex={colIndex}
                  columnId={columnId}
                  setCellProps={noop}
                  isExpandable={false}
                  isExpanded={false}
                  isDetails={false}
                />
              ) : null;
            }
          : undefined,
      [FooterCellValue, controlFooters, cellContext, rowCount, rows.length]
    );

    /**
     * Attributes EuiDataGrid puts on its cells, for code that looks cells up in the DOM, e.g. the
     * in-table search to mark its active match.
     */
    const controlColumnIdsKey = [
      ...(leadingControlColumns ?? []).map(({ id: columnId }) => columnId),
      ...(trailingControlColumns ?? []).map(({ id: columnId }) => columnId),
    ].join('\n');
    const controlColumnIds = useMemo(
      () => new Set(controlColumnIdsKey.split('\n')),
      [controlColumnIdsKey]
    );
    const getCellProps = useCallback<NonNullable<DataGridProps<number>['getCellProps']>>(
      ({ rowIndex, columnId }) => ({
        className: controlColumnIds.has(columnId)
          ? 'euiDataGridRowCell euiDataGridRowCell--controlColumn'
          : 'euiDataGridRowCell',
        attributes: {
          'data-gridcell-row-index': pageStart + rowIndex,
          'data-gridcell-visible-row-index': rowIndex,
        },
      }),
      [controlColumnIds, pageStart]
    );

    /**
     * Popover
     */
    const PopoverRenderer = renderCellPopover as
      | ComponentType<EuiDataGridCellPopoverElementProps>
      | undefined;
    // Read when the popover renders: the columns are rebuilt often, the popover renderer is not.
    const columnsByIdRef = useRef(columnsById);
    columnsByIdRef.current = columnsById;
    const renderPopover = useMemo(
      () =>
        PopoverRenderer
          ? (props: DataGridCellPopoverProps<number>) => (
              <PopoverBridge
                {...props}
                PopoverRenderer={PopoverRenderer}
                schema={columnsByIdRef.current.get(props.columnId)?.schema}
                pageStart={pageStart}
              />
            )
          : undefined,
      [PopoverRenderer, pageStart]
    );

    /**
     * Style
     */
    // What gridStyle leaves out looks like in EuiDataGrid.
    const dataGridStyle = useMemo<DataGridStyle>(() => {
      const {
        cellPadding = EUI_DEFAULT_GRID_STYLE.cellPadding,
        fontSize = EUI_DEFAULT_GRID_STYLE.fontSize,
        border = EUI_DEFAULT_GRID_STYLE.border,
        stripes = EUI_DEFAULT_GRID_STYLE.stripes,
        rowHover = EUI_DEFAULT_GRID_STYLE.rowHover,
        header = EUI_DEFAULT_GRID_STYLE.header,
        footer = EUI_DEFAULT_GRID_STYLE.footer,
      } = gridStyle ?? {};
      return { cellPadding, fontSize, border, stripes, rowHover, header, footer };
    }, [gridStyle]);
    const rowHeight = getRowHeight(rowHeightsOptions?.defaultHeight);

    /**
     * Full screen
     */
    const [isFullScreen, setIsFullScreenState] = useState(false);
    const setIsFullScreen = useCallback(
      (next: boolean) => {
        setIsFullScreenState(next);
        onFullScreenChange?.(next);
      },
      [onFullScreenChange]
    );
    // Captured: the grid keeps Escape from bubbling up, so a flyout around it does not close.
    // Escape leaves full screen from the toolbar or a focused cell or header, but not from cell
    // content, which uses it itself, nor from popovers and flyouts, which are rendered in portals.
    const rootRef = useRef<HTMLDivElement>(null);
    const onKeyDownCapture = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        const { key, target } = event;
        if (!isFullScreen || key !== keys.ESCAPE || !(target instanceof Element)) {
          return;
        }
        const isInPortal = !rootRef.current?.contains(target);
        const isInCellContent =
          target.closest('[role="grid"]') && !target.matches(GRID_CELL_SELECTOR);
        if (isInPortal || isInCellContent) {
          return;
        }
        setIsFullScreen(false);
      },
      [isFullScreen, setIsFullScreen]
    );

    /**
     * Ref, in the terms of `EuiDataGrid`: `colIndex` counts the control columns, `rowIndex` is the
     * index in the current page.
     */
    useImperativeHandle(
      ref,
      () => {
        const allColumnIds = [
          ...(leadingControlColumns ?? []).map(({ id: columnId }) => columnId),
          ...visibleColumns,
          ...(trailingControlColumns ?? []).map(({ id: columnId }) => columnId),
        ];
        return {
          setIsFullScreen,
          setFocusedCell: ({ rowIndex, colIndex }) =>
            gridRef.current?.setFocusedCell({
              rowIndex,
              columnId: allColumnIds[colIndex],
            }),
          openCellPopover: ({ rowIndex, colIndex }) =>
            gridRef.current?.openCellPopover({
              rowIndex,
              columnId: allColumnIds[colIndex],
            }),
          closeCellPopover: () => gridRef.current?.closeCellPopover(),
          scrollToItem: ({ rowIndex, columnIndex, align } = {}) =>
            gridRef.current?.scrollToItem({
              rowIndex,
              columnId: columnIndex === undefined ? undefined : allColumnIds[columnIndex],
              align: align === 'smart' ? 'auto' : align,
            }),
        };
      },
      [setIsFullScreen, leadingControlColumns, trailingControlColumns, visibleColumns]
    );

    /**
     * Toolbar
     */
    const [toolbarElement, setToolbarElement] = useState<HTMLElement | null>(null);
    const [toolbarWidth, setToolbarWidth] = useState(0);
    useEffect(() => {
      if (!toolbarElement) {
        return;
      }
      const observer = new ResizeObserver(([entry]) => setToolbarWidth(entry.contentRect.width));
      observer.observe(toolbarElement);
      return () => observer.disconnect();
    }, [toolbarElement]);
    const hasRoomForGridControls =
      toolbarWidth === 0 || toolbarWidth >= MIN_WIDTH_FOR_GRID_CONTROLS;

    const sortableColumns = useMemo(
      () =>
        orderedColumns
          .filter(({ isSortable }) => isSortable !== false)
          .map(({ id: columnId, displayAsText, schema }) => ({
            id: columnId,
            displayAsText: displayAsText ?? columnId,
            schema,
          })),
      [orderedColumns]
    );

    const toolbar = useMemo(() => {
      const toolbarOptions: EuiDataGridToolBarVisibilityOptions | false =
        toolbarVisibility === true ? {} : toolbarVisibility;
      if (toolbarOptions === false) {
        return undefined;
      }
      const {
        showColumnSelector = true,
        showSortSelector = true,
        showDisplaySelector = true,
        showKeyboardShortcuts = true,
        showFullScreenSelector = true,
        additionalControls,
      } = toolbarOptions;

      const columnSelectorOptions =
        typeof showColumnSelector === 'object' ? showColumnSelector : {};
      const displaySelectorOptions =
        typeof showDisplaySelector === 'object' ? showDisplaySelector : {};
      const canChangeDensity =
        Boolean(gridStyle?.onChange) && displaySelectorOptions.allowDensity !== false;
      const density = getDensity(gridStyle ?? {});

      const columnControl = showColumnSelector ? (
        <ColumnSelector
          columns={orderedColumns.map(({ id: columnId, displayAsText }) => ({
            id: columnId,
            displayAsText: displayAsText ?? columnId,
          }))}
          onReorder={columnSelectorOptions.allowReorder === false ? undefined : setVisibleColumns}
        />
      ) : null;
      const columnSortingControl =
        showSortSelector && sorting ? (
          <SortSelector columns={sortableColumns} sorting={sorting} />
        ) : null;
      const keyboardShortcutsControl = showKeyboardShortcuts ? <KeyboardShortcuts /> : null;
      const displayControl = showDisplaySelector ? (
        <DisplaySelector
          density={density}
          onChangeDensity={
            canChangeDensity
              ? (next) => gridStyle?.onChange?.({ ...gridStyle, ...DENSITY_STYLES[next] })
              : undefined
          }
          renderCustomContent={
            displaySelectorOptions.customRender
              ? ({ densityControl }) =>
                  displaySelectorOptions.customRender?.({
                    densityControl,
                    rowHeightControl: null,
                    additionalDisplaySettings: displaySelectorOptions.additionalDisplaySettings,
                    resetButton: null,
                  })
              : undefined
          }
        />
      ) : null;
      const fullScreenControl = showFullScreenSelector ? (
        <FullScreenSelector
          isFullScreen={isFullScreen}
          onToggle={() => setIsFullScreen(!isFullScreen)}
        />
      ) : null;

      if (renderCustomToolbar) {
        return renderCustomToolbar({
          hasRoomForGridControls,
          columnControl,
          columnSortingControl,
          keyboardShortcutsControl,
          displayControl,
          fullScreenControl,
        });
      }

      const controls = isAdditionalControlsOptions(additionalControls)
        ? additionalControls
        : { left: additionalControls };
      return (
        <EuiFlexGroup
          responsive={false}
          gutterSize="s"
          alignItems="center"
          justifyContent="spaceBetween"
          css={{ padding: euiThemeContext.euiTheme.size.s }}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              {hasRoomForGridControls && columnControl && (
                <EuiFlexItem grow={false}>{columnControl}</EuiFlexItem>
              )}
              {hasRoomForGridControls && columnSortingControl && (
                <EuiFlexItem grow={false}>{columnSortingControl}</EuiFlexItem>
              )}
              {controls.left !== undefined && (
                <EuiFlexItem grow={false}>{getLeftControls(controls.left)}</EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
              {controls.right !== undefined && (
                <EuiFlexItem grow={false}>{controls.right}</EuiFlexItem>
              )}
              {hasRoomForGridControls && keyboardShortcutsControl}
              {hasRoomForGridControls && displayControl}
              {fullScreenControl}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }, [
      toolbarVisibility,
      gridStyle,
      orderedColumns,
      setVisibleColumns,
      sorting,
      sortableColumns,
      renderCustomToolbar,
      hasRoomForGridControls,
      isFullScreen,
      setIsFullScreen,
      euiThemeContext.euiTheme.size.s,
    ]);

    return (
      <div
        ref={rootRef}
        id={id}
        onKeyDownCapture={onKeyDownCapture}
        className={['euiDataGrid', isFullScreen ? 'euiDataGrid--fullScreen' : '', className]
          .filter(Boolean)
          .join(' ')}
        data-test-subj={dataTestSubj}
        css={[rootStyles, isFullScreen && fullScreenStyles(euiThemeContext)]}
      >
        {toolbar && <div ref={setToolbarElement}>{toolbar}</div>}
        <div css={gridAreaStyles}>
          <DataGrid<number>
            gridRef={gridRef}
            className="euiDataGrid__virtualized"
            data-test-subj={dataTestSubj ? `${dataTestSubj}Grid` : undefined}
            ariaLabel={ariaLabel}
            ariaLabelledBy={ariaLabelledBy}
            ariaDescribedBy={ariaDescribedBy}
            rows={rows}
            getRowId={String}
            columns={gridColumns}
            leadingControlColumns={leadingColumns}
            trailingControlColumns={trailingColumns}
            columnWidths={columnWidths}
            onColumnResize={onResize}
            sorting={sorting}
            onMoveColumn={moveColumn}
            onHideColumn={hideColumn}
            onReorderColumn={canDragAndDropColumns ? reorderColumn : undefined}
            headerRowHeight="auto"
            stickyColumnCount={stickyColumnCount}
            getCellProps={getCellProps}
            gridStyle={dataGridStyle}
            rowHeight={rowHeight}
            lineHeight={rowHeightsOptions?.lineHeight}
            overscan={virtualizationOptions?.overscanRowCount ?? EUI_DEFAULT_OVERSCAN}
            onScroll={onScroll}
            renderCellPopover={renderPopover}
            renderFooterCell={renderFooterCell}
            onRenderComplete={onRenderComplete}
            // Like in EuiDataGrid the cells close their popover, or Escape does.
            showCellPopoverCloseButton={false}
          />
        </div>
        {pagination && (
          <DataGridPagination
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize ?? rowCount}
            pageSizeOptions={pagination.pageSizeOptions}
            rowCount={rowCount}
            ariaControls={id}
            onChangePage={pagination.onChangePage}
            onChangePageSize={pagination.onChangeItemsPerPage}
          />
        )}
      </div>
    );
  }
);
