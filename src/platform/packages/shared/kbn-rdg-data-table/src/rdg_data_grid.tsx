/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DataGrid, {
  Row,
  renderHeaderCell as renderDefaultHeaderCell,
  type Column,
  type RenderHeaderCellProps,
  type RenderRowProps,
  type SortColumn,
} from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  euiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  canPrependTimeFieldColumn,
  formatFieldValueReact,
  getDataViewFieldFromDataSource,
  getShouldShowFieldHandler,
  getVisibleColumns,
} from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import {
  DataGridDensity,
  DataLoadingState,
  DEFAULT_PAGINATION_MODE,
  DEFAULT_ROWS_PER_PAGE,
  ROWS_HEIGHT_OPTIONS,
  RowHeightType,
  SOURCE_COLUMN,
  UnifiedDataTableFooter,
  UnifiedDataTableSourceColumnHeader,
  defaultTimeColumnWidth,
  getDataGridDensityPadding,
  getDisplayedColumns,
  getRowsPerPageOptions,
  getSchemaByKbnType,
  isSortable,
  useDataGridDensity,
  useFullScreenWatcher,
  useRowHeight,
  useUnifiedDataTableRestorableState as useRestorableState,
  withUnifiedDataTableRestorableState,
  type SortOrder,
} from '@kbn/unified-data-table';
import type { TanStackDataGridProps } from '@kbn/tanstack-data-table';
import { getRdgDataGridStyles } from './rdg_data_grid.styles';
import {
  CONTROL_COL_WIDTH,
  CellContent,
  CustomDataCell,
  DEFAULT_COL_WIDTH,
  ExpandedDocIdContext,
  MIN_COL_WIDTH,
  ROW_INDICATOR_COL_WIDTH,
  RowControlsCell,
  RowIndicatorCell,
  SELECT_COL_WIDTH,
  SelectAllHeaderCell,
  SelectRowCell,
  SummaryCellContent,
  getInlineRowControlSlots,
} from './rdg_grid_cells';

/** Same props as `TanStackDataGrid`, so Discover can switch grids with a feature flag only. */
export type RdgDataGridProps = TanStackDataGridProps;

const ROW_INDICATOR_COLUMN_ID = 'colorIndicator';
const SELECT_COLUMN_ID = 'select';
const EXPAND_COLUMN_ID = 'actions';
const DEFAULT_MAX_DOC_FIELDS_DISPLAYED = 50;
const SUMMARY_COLUMN_MIN_WIDTH = 300;
const RESIZE_COMMIT_DELAY_MS = 300;

const rowKeyGetter = (row: DataTableRecord): string => row.id;

const toSortColumns = (sort: SortOrder[]): SortColumn[] =>
  sort.map(([columnKey, direction]) => ({
    columnKey,
    direction: direction === 'desc' ? 'DESC' : 'ASC',
  }));

const toSortOrder = (sortColumns: SortColumn[]): SortOrder[] =>
  sortColumns.map(({ columnKey, direction }) => [columnKey, direction === 'DESC' ? 'desc' : 'asc']);

/** Adds the row attributes that test helpers read from the other grids. */
const renderRow = (key: React.Key, props: RenderRowProps<DataTableRecord>) => (
  <Row key={key} {...props} data-grid-visible-row-index={props.rowIdx} />
);

const RdgDataGridComponent: React.FC<RdgDataGridProps> = ({
  rows,
  columns,
  dataSource,
  externalCustomRenderers,
  dataView,
  showTimeCol,
  sort = [],
  onSort,
  isSortEnabled = true,
  settings,
  onResize,
  expandedDoc,
  setExpandedDoc,
  renderDocumentView,
  loadingState,
  getRowIndicator,
  rowAdditionalLeadingControls,
  dataGridDensityState,
  onUpdateDataGridDensity,
  rowHeightState,
  onUpdateRowHeight,
  configRowHeight,
  headerRowHeightState,
  onUpdateHeaderRowHeight,
  configHeaderRowHeight,
  sampleSizeState = 500,
  services,
  consumer = 'discover',
  externalAdditionalControls,
  toolbarLeftSide,
  toolbarTrailingControl,
  toolbarBottomSection,
  maxDocFieldsDisplayed = DEFAULT_MAX_DOC_FIELDS_DISPLAYED,
  showMultiFields = true,
  ariaLabelledBy = 'documentsAriaLabel',
  documentsDisplayModeState,
  isPaginationEnabled = true,
  paginationMode = DEFAULT_PAGINATION_MODE,
  rowsPerPageState,
  rowsPerPageOptions,
  onUpdateRowsPerPage,
  onUpdatePageIndex,
  totalHits,
  onFetchMoreRecords,
}) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const { fieldFormats, storage, data } = services;
  const { dataGridId, setDataGridWrapper } = useFullScreenWatcher();
  const timeFieldName = dataView.timeFieldName;

  // ── Columns ──
  const documentsDisplayMode = documentsDisplayModeState ?? 'table';
  const displayedColumns = useMemo(
    () => getDisplayedColumns(columns, dataView, documentsDisplayMode),
    [columns, dataView, documentsDisplayMode]
  );
  const shouldPrependTimeFieldColumn = useMemo(
    () => canPrependTimeFieldColumn(displayedColumns, timeFieldName, dataSource, showTimeCol),
    [dataSource, displayedColumns, showTimeCol, timeFieldName]
  );
  const isSummaryMode = displayedColumns.length === 1 && displayedColumns[0] === SOURCE_COLUMN;
  const effectiveColumns = useMemo(
    () => getVisibleColumns(displayedColumns, dataView, shouldPrependTimeFieldColumn),
    [dataView, displayedColumns, shouldPrependTimeFieldColumn]
  );
  const shouldShowFieldHandler = useMemo(() => {
    const dataViewFields = dataView.fields.getAll().map((field) => field.name);
    return getShouldShowFieldHandler(dataViewFields, dataView, showMultiFields);
  }, [dataView, showMultiFields]);

  // ── Selection ──
  const [selectedDocsMap, setSelectedDocsMap] = useRestorableState('selectedDocsMap', {});
  const selectedRows = useMemo(
    () => new Set(Object.keys(selectedDocsMap).filter((id) => selectedDocsMap[id])),
    [selectedDocsMap]
  );
  const onSelectedRowsChange = useCallback(
    (next: Set<string>) =>
      setSelectedDocsMap(Object.fromEntries(Array.from(next, (id) => [id, true]))),
    [setSelectedDocsMap]
  );

  // ── Pagination (multiPage mirrors EuiDataGrid; only shown when needed) ──
  const [currentPageIndex, setCurrentPageIndex] = useRestorableState('pageIndex', 0);
  const currentPageSize =
    typeof rowsPerPageState === 'number' && rowsPerPageState > 0
      ? rowsPerPageState
      : DEFAULT_ROWS_PER_PAGE;
  const pageSizeOptions = useMemo(
    () => rowsPerPageOptions ?? getRowsPerPageOptions(currentPageSize),
    [rowsPerPageOptions, currentPageSize]
  );
  const rowCount = rows.length;
  const pageCount = Math.max(1, Math.ceil(rowCount / currentPageSize));
  const isMultiPagePagination = isPaginationEnabled && paginationMode === 'multiPage';
  const changeCurrentPageIndex = useCallback(
    (nextPageIndex: number) => {
      setCurrentPageIndex(nextPageIndex);
      onUpdatePageIndex?.(nextPageIndex);
    },
    [onUpdatePageIndex, setCurrentPageIndex]
  );
  useEffect(() => {
    if (currentPageIndex > pageCount - 1) {
      changeCurrentPageIndex(0);
    }
  }, [changeCurrentPageIndex, currentPageIndex, pageCount]);
  const shouldShowPagination =
    isMultiPagePagination &&
    rowCount > 0 &&
    rowCount >= (Math.min(...pageSizeOptions) || currentPageSize);
  const pageStart = isMultiPagePagination ? currentPageIndex * currentPageSize : 0;
  const pageRows = useMemo(
    () => (isMultiPagePagination ? rows.slice(pageStart, pageStart + currentPageSize) : rows),
    [rows, isMultiPagePagination, pageStart, currentPageSize]
  );

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    setHasScrolledToBottom(scrollTop + clientHeight >= scrollHeight - 5);
  }, []);

  // ── Density and row heights (same formulas as the TanStack grid) ──
  const { dataGridDensity } = useDataGridDensity({
    storage,
    consumer,
    dataGridDensityState,
    onUpdateDataGridDensity,
  });
  const isCompressed = dataGridDensity === DataGridDensity.COMPACT;
  const densityCfg = useMemo(() => {
    const cellPadding = parseFloat(getDataGridDensityPadding(euiTheme, dataGridDensity));
    const { fontSize } = euiFontSize(euiThemeContext, isCompressed ? 'xs' : 's', { unit: 'px' });
    const numericFontSize = parseFloat(String(fontSize ?? (isCompressed ? '12px' : '14px')));
    const lineHeight = numericFontSize * 1.6;
    const getRowHeightForLines = (lines: number) =>
      Math.ceil(lines * Math.trunc(lineHeight)) + Math.trunc(cellPadding) * 2;
    return {
      cellPadding,
      fontSize: numericFontSize,
      lineHeight,
      headerLineHeight: parseFloat(euiTheme.size.base),
      getRowHeightForLines,
    };
  }, [dataGridDensity, euiTheme, euiThemeContext, isCompressed]);

  const { rowHeightLines: headerRowHeightLines } = useRowHeight({
    type: RowHeightType.header,
    storage,
    consumer,
    key: 'dataGridHeaderRowHeight',
    defaultRowHeight: 1,
    configRowHeight: configHeaderRowHeight,
    rowHeightState: headerRowHeightState,
    onUpdateRowHeight: onUpdateHeaderRowHeight,
  });
  const { rowHeightLines } = useRowHeight({
    type: RowHeightType.row,
    storage,
    consumer,
    key: 'dataGridRowHeight',
    defaultRowHeight: ROWS_HEIGHT_OPTIONS.default,
    configRowHeight,
    rowHeightState,
    onUpdateRowHeight,
  });
  // react-data-grid needs explicit heights: "auto" uses the TanStack grid's height estimate.
  const isAutoRowHeight = rowHeightLines === ROWS_HEIGHT_OPTIONS.auto;
  const rowLines = isAutoRowHeight ? (isSummaryMode ? 3 : 1) : Math.max(1, rowHeightLines);
  const rowHeight = densityCfg.getRowHeightForLines(rowLines);
  const styles = useMemo(() => getRdgDataGridStyles(euiTheme, rowLines), [euiTheme, rowLines]);
  const headerLines =
    headerRowHeightLines === ROWS_HEIGHT_OPTIONS.auto ? 1 : Math.max(1, headerRowHeightLines);
  const headerRowHeight = Math.ceil(
    headerLines * densityCfg.headerLineHeight + densityCfg.cellPadding * 2
  );

  // ── Sorting ──
  const sortColumns = useMemo(() => toSortColumns(sort), [sort]);
  const onSortColumnsChange = useCallback(
    (next: SortColumn[]) => onSort?.(toSortOrder(next)),
    [onSort]
  );

  // ── Expanded document ──
  const [localExpandedDoc, setLocalExpandedDoc] = useState<DataTableRecord | undefined>();
  const currentExpandedDoc = expandedDoc ?? localExpandedDoc;
  const expandedDocRef = useRef(currentExpandedDoc);
  expandedDocRef.current = currentExpandedDoc;
  const onToggleExpandDoc = useCallback(
    (doc: DataTableRecord) => {
      const next = expandedDocRef.current?.id === doc.id ? undefined : doc;
      if (setExpandedDoc) {
        setExpandedDoc(next);
      } else {
        setLocalExpandedDoc(next);
      }
    },
    [setExpandedDoc]
  );
  const expandedDocId = currentExpandedDoc?.id;
  const rowClass = useCallback(
    (row: DataTableRecord) => (row.id === expandedDocId ? 'rdgKbn__row--expanded' : undefined),
    [expandedDocId]
  );

  // ── Column defs (memoized: a new array makes react-data-grid recompute all column metrics) ──
  const actionsColumnWidth =
    densityCfg.cellPadding * 2 +
    CONTROL_COL_WIDTH +
    (rowAdditionalLeadingControls
      ?.slice(0, getInlineRowControlSlots(rowAdditionalLeadingControls))
      .reduce((width, control) => width + (control.width ?? CONTROL_COL_WIDTH), 0) ?? 0) +
    ((rowAdditionalLeadingControls?.length ?? 0) >
    getInlineRowControlSlots(rowAdditionalLeadingControls)
      ? CONTROL_COL_WIDTH
      : 0);

  const rdgColumns = useMemo<Array<Column<DataTableRecord>>>(() => {
    const defs: Array<Column<DataTableRecord>> = [];
    const controlColumn = {
      frozen: true,
      resizable: false,
      sortable: false,
    } as const;

    if (getRowIndicator) {
      defs.push({
        ...controlColumn,
        key: ROW_INDICATOR_COLUMN_ID,
        name: '',
        width: ROW_INDICATOR_COL_WIDTH,
        minWidth: ROW_INDICATOR_COL_WIDTH,
        renderCell: ({ row }) => (
          <RowIndicatorCell record={row} getRowIndicator={getRowIndicator} />
        ),
      });
    }

    defs.push({
      ...controlColumn,
      key: SELECT_COLUMN_ID,
      name: '',
      width: SELECT_COL_WIDTH,
      minWidth: SELECT_COL_WIDTH,
      renderHeaderCell: () => <SelectAllHeaderCell />,
      renderCell: ({ row, rowIdx }) => (
        <CellContent columnId={SELECT_COLUMN_ID} columnIndex={-1} className="rdgKbn__control">
          <SelectRowCell record={row} rowIndex={rowIdx} />
        </CellContent>
      ),
    });

    defs.push({
      ...controlColumn,
      key: EXPAND_COLUMN_ID,
      name: '',
      width: actionsColumnWidth,
      minWidth: actionsColumnWidth,
      renderCell: ({ row, rowIdx }) => (
        <CellContent columnId={EXPAND_COLUMN_ID} columnIndex={-1} className="rdgKbn__control">
          <RowControlsCell
            record={row}
            rowIndex={rowIdx}
            rowAdditionalLeadingControls={rowAdditionalLeadingControls}
            onToggleExpand={onToggleExpandDoc}
          />
        </CellContent>
      ),
    });

    const renderDataHeaderCell = (columnId: string) =>
      function DataHeaderCell(props: RenderHeaderCellProps<DataTableRecord>) {
        return (
          <span data-test-subj={`dataGridHeaderCell-${columnId}`}>
            {renderDefaultHeaderCell(props)}
          </span>
        );
      };

    const summaryColumn: Column<DataTableRecord> = {
      key: SOURCE_COLUMN,
      name: '',
      minWidth: SUMMARY_COLUMN_MIN_WIDTH,
      resizable: false,
      sortable: false,
      renderHeaderCell: () => (
        <UnifiedDataTableSourceColumnHeader headerRowHeight={headerRowHeightLines} />
      ),
      renderCell: ({ row, rowIdx }) => (
        <CellContent
          columnId={SOURCE_COLUMN}
          columnIndex={effectiveColumns.indexOf(SOURCE_COLUMN)}
          className="rdgKbn__cellContent"
        >
          {externalCustomRenderers?.[SOURCE_COLUMN] ? (
            <span className="unifiedDataTable__cellValue">
              <CustomDataCell
                Renderer={externalCustomRenderers[SOURCE_COLUMN]}
                row={row}
                rowIndex={pageStart + rowIdx}
                columnId={SOURCE_COLUMN}
                colIndex={effectiveColumns.indexOf(SOURCE_COLUMN)}
                dataView={dataView}
                fieldFormats={fieldFormats}
                dataSource={dataSource}
                isCompressed={isCompressed}
              />
            </span>
          ) : (
            <SummaryCellContent
              row={row}
              dataView={dataView}
              shouldShowFieldHandler={shouldShowFieldHandler}
              fieldFormats={fieldFormats}
              dataSource={dataSource}
              isCompressed={isCompressed}
              maxEntries={maxDocFieldsDisplayed}
            />
          )}
        </CellContent>
      ),
    };

    const dataColumnIds =
      isSummaryMode && shouldPrependTimeFieldColumn && timeFieldName
        ? [timeFieldName]
        : isSummaryMode
        ? []
        : effectiveColumns;

    for (const [colIndex, colId] of dataColumnIds.entries()) {
      if (colId === SOURCE_COLUMN) {
        defs.push(summaryColumn);
        continue;
      }
      const dataViewField = getDataViewFieldFromDataSource({
        dataView,
        dataSource,
        fieldName: colId,
      });
      const isTimeField = colId === timeFieldName;
      const columnIsSortable =
        !isSummaryMode &&
        isSortEnabled &&
        isSortable({
          dataSource,
          columnName: colId,
          columnSchema: getSchemaByKbnType(dataViewField?.type),
          dataViewField,
        });
      const CustomRenderer = externalCustomRenderers?.[colId];

      defs.push({
        key: colId,
        name: settings?.columns?.[colId]?.display ?? colId,
        width:
          settings?.columns?.[colId]?.width ??
          (isTimeField ? defaultTimeColumnWidth : DEFAULT_COL_WIDTH),
        minWidth: MIN_COL_WIDTH,
        resizable: true,
        sortable: columnIsSortable,
        renderHeaderCell: renderDataHeaderCell(colId),
        renderCell: ({ row, rowIdx }) => (
          <CellContent columnId={colId} columnIndex={colIndex} className="rdgKbn__cellContent">
            {CustomRenderer ? (
              <CustomDataCell
                Renderer={CustomRenderer}
                row={row}
                rowIndex={pageStart + rowIdx}
                columnId={colId}
                colIndex={colIndex}
                dataView={dataView}
                fieldFormats={fieldFormats}
                dataSource={dataSource}
                isCompressed={isCompressed}
              />
            ) : (
              formatFieldValueReact({
                value: row.flattened[colId],
                hit: row.raw,
                fieldFormats,
                dataView,
                field: dataViewField,
              })
            )}
          </CellContent>
        ),
      });
    }

    if (isSummaryMode) {
      defs.push(summaryColumn);
    }

    return defs;
  }, [
    actionsColumnWidth,
    dataSource,
    dataView,
    effectiveColumns,
    externalCustomRenderers,
    fieldFormats,
    getRowIndicator,
    headerRowHeightLines,
    isCompressed,
    isSortEnabled,
    isSummaryMode,
    maxDocFieldsDisplayed,
    onToggleExpandDoc,
    rowAdditionalLeadingControls,
    pageStart,
    settings,
    shouldPrependTimeFieldColumn,
    shouldShowFieldHandler,
    timeFieldName,
  ]);

  // ── Column resizing: react-data-grid reports every pointer move, so commit once it settles ──
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const onColumnResize = useCallback(
    (index: number, width: number) => {
      const columnId = rdgColumns[index]?.key;
      if (!columnId || !onResize) return;
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(
        () => onResize({ columnId, width: Math.round(width) }),
        RESIZE_COMMIT_DELAY_MS
      );
    },
    [onResize, rdgColumns]
  );
  useEffect(() => () => clearTimeout(resizeTimeoutRef.current), []);

  const gridStyle = useMemo(
    () =>
      ({
        '--rdg-kbn-font-size': `${densityCfg.fontSize}px`,
        '--rdg-kbn-line-height': `${Math.trunc(densityCfg.lineHeight)}px`,
        '--rdg-kbn-cell-padding': `${Math.trunc(densityCfg.cellPadding)}px`,
      } as React.CSSProperties),
    [densityCfg]
  );

  const isLoaded = loadingState === DataLoadingState.loaded;
  const toolbar = (
    <div css={styles.toolbar} data-test-subj="unifiedDataTableToolbar">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
        {toolbarLeftSide && <EuiFlexItem grow={false}>{toolbarLeftSide}</EuiFlexItem>}
        {externalAdditionalControls && (
          <EuiFlexItem grow={false}>{externalAdditionalControls}</EuiFlexItem>
        )}
      </EuiFlexGroup>
      {toolbarTrailingControl && <div>{toolbarTrailingControl}</div>}
    </div>
  );

  if (rows.length === 0 && loadingState !== DataLoadingState.loading) {
    return (
      <div
        className="euiDataGrid__noResults"
        css={styles.noResults}
        data-test-subj="discoverDocTable"
        data-table-loaded={isLoaded}
        data-document-number={0}
      >
        <EuiText size="xs" color="subdued" textAlign="center">
          <EuiIcon type="discoverApp" size="m" color="subdued" aria-hidden="true" />
          <EuiSpacer size="s" />
          {i18n.translate('discover.grid.rdg.noResultsFound', {
            defaultMessage: 'No results found',
          })}
        </EuiText>
      </div>
    );
  }

  return (
    <div
      ref={setDataGridWrapper}
      id={dataGridId}
      css={styles.wrapper}
      // Same test attributes as UnifiedDataTable, so test helpers work with all grids.
      data-test-subj="discoverDocTable"
      data-table-loaded={isLoaded}
      data-document-number={rows.length}
      data-grid-implementation="rdg"
    >
      {toolbar}
      {toolbarBottomSection}
      <ExpandedDocIdContext.Provider value={expandedDocId}>
        <DataGrid
          aria-labelledby={ariaLabelledBy}
          className="rdg-light"
          css={styles.grid}
          style={gridStyle}
          columns={rdgColumns}
          rows={pageRows}
          rowKeyGetter={rowKeyGetter}
          rowHeight={rowHeight}
          headerRowHeight={headerRowHeight}
          rowClass={rowClass}
          sortColumns={sortColumns}
          onSortColumnsChange={onSortColumnsChange}
          selectedRows={selectedRows}
          onSelectedRowsChange={onSelectedRowsChange}
          onColumnResize={onColumnResize}
          onScroll={onScroll}
          renderers={{ renderRow }}
        />
      </ExpandedDocIdContext.Provider>

      {shouldShowPagination && (
        <div css={styles.pagination} data-test-subj="rdgDataGridPagination">
          <EuiTablePagination
            aria-controls={dataGridId}
            activePage={currentPageIndex}
            itemsPerPage={currentPageSize}
            itemsPerPageOptions={pageSizeOptions}
            showPerPageOptions={pageSizeOptions.length > 0}
            pageCount={pageCount}
            onChangePage={changeCurrentPageIndex}
            onChangeItemsPerPage={(nextPageSize) => {
              onUpdateRowsPerPage?.(nextPageSize);
              changeCurrentPageIndex(0);
            }}
            aria-label={i18n.translate('discover.grid.rdg.paginationAriaLabel', {
              defaultMessage: 'Pagination for documents table',
            })}
          />
        </div>
      )}

      {loadingState !== DataLoadingState.loading && isPaginationEnabled && (
        <UnifiedDataTableFooter
          isLoadingMore={loadingState === DataLoadingState.loadingMore}
          rowCount={rowCount}
          sampleSize={sampleSizeState}
          pageCount={pageCount}
          pageIndex={isMultiPagePagination ? currentPageIndex : 0}
          totalHits={totalHits}
          onFetchMoreRecords={onFetchMoreRecords}
          data={data}
          fieldFormats={fieldFormats}
          paginationMode={paginationMode}
          hasScrolledToBottom={paginationMode !== 'multiPage' ? hasScrolledToBottom : true}
        />
      )}

      {currentExpandedDoc && setExpandedDoc && typeof renderDocumentView === 'function' && (
        <span className="dscTable__flyout">
          {renderDocumentView(currentExpandedDoc, rows, displayedColumns, dataSource)}
        </span>
      )}
    </div>
  );
};

/**
 * Restores selection and pagination per Discover tab, through the same `initialState` /
 * `onInitialStateChange` props as UnifiedDataTable.
 */
export const RdgDataGrid = withUnifiedDataTableRestorableState(RdgDataGridComponent);
