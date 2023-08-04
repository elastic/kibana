/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import classnames from 'classnames';
import { FormattedMessage } from '@kbn/i18n-react';
import { of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import './data_table.scss';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  EuiDataGridSorting,
  EuiDataGrid,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
  EuiLoadingSpinner,
  EuiIcon,
  EuiDataGridRefProps,
  EuiDataGridInMemory,
  EuiDataGridProps,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DocViewFilterFn } from '@kbn/discover-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import {
  useDataGridColumnsCellActions,
  type UseDataGridColumnsCellActionsProps,
} from '@kbn/cell-actions';
import type { ToastsStart, IUiSettingsClient, HttpStart, CoreStart } from '@kbn/core/public';
import { Serializable } from '@kbn/utility-types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { getShouldShowFieldHandler } from '@kbn/discover-utils';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '@kbn/discover-utils';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { UnifiedDataTableSettings, ValueToStringConverter } from '../types';
import { getDisplayedColumns } from '../utils/columns';
import { convertValueToString } from '../utils/convert_value_to_string';
import { getRowsPerPageOptions } from '../utils/rows_per_page';
import { getRenderCellValueFn } from '../utils/get_render_cell_value';
import { getEuiGridColumns, getLeadControlColumns, getVisibleColumns } from './data_table_columns';
import { UnifiedDataTableContext } from '../table_context';
import { getSchemaDetectors } from './data_table_schema';
import { DataTableDocumentToolbarBtn } from './data_table_document_selection';
import { useRowHeightsOptions } from '../hooks/use_row_heights_options';
import {
  DEFAULT_ROWS_PER_PAGE,
  GRID_STYLE,
  toolbarVisibility as toolbarVisibilityDefaults,
} from '../constants';

const themeDefault = { darkMode: false };

interface SortObj {
  id: string;
  direction: string;
}

export interface UnifiedDataTableProps {
  /**
   * Determines which element labels the grid for ARIA
   */
  ariaLabelledBy: string;
  /**
   * Optional class name to apply
   */
  className?: string;
  /**
   * Determines ids of the columns which are displayed
   */
  columnsIds: string[];
  /**
   * If set, the given document is displayed in a flyout
   */
  expandedDoc?: DataTableRecord;
  /**
   * The used data view
   */
  dataView: DataView;
  /**
   * Determines if data is currently loaded
   */
  isLoading: boolean;
  /**
   * Function to add a filter in the grid cell or document flyout
   */
  onFilter: DocViewFilterFn;
  /**
   * Function triggered when a column is resized by the user
   */
  onResize?: (colSettings: { columnId: string; width: number }) => void;
  /**
   * Function to set all columns
   */
  onSetColumns: (columns: string[], hideTimeColumn: boolean) => void;
  /**
   * function to change sorting of the documents, skipped when isSortEnabled is set to false
   */
  onSort?: (sort: string[][]) => void;
  /**
   * Array of documents provided by Elasticsearch
   */
  rows?: DataTableRecord[];
  /**
   * The max size of the documents returned by Elasticsearch
   */
  sampleSize?: number;
  /**
   * Function to set the expanded document, which is displayed in a flyout
   */
  setExpandedDoc?: (doc?: DataTableRecord) => void;
  /**
   * Grid display settings persisted in Elasticsearch (e.g. column width)
   */
  settings?: UnifiedDataTableSettings;
  /**
   * Saved search description
   */
  searchDescription?: string;
  /**
   * Saved search title
   */
  searchTitle?: string;
  /**
   * Determines whether the time columns should be displayed (legacy settings)
   */
  showTimeCol: boolean;
  /**
   * Determines whether the full screen button should be displayed
   */
  showFullScreenButton?: boolean;
  /**
   * Manage user sorting control
   */
  isSortEnabled?: boolean;
  /**
   * Current sort setting
   */
  sort: SortOrder[];
  /**
   * How the data is fetched
   */
  useNewFieldsApi: boolean;
  /**
   * Manage pagination control
   */
  isPaginationEnabled?: boolean;
  /**
   * List of used control columns (available: 'openDetails', 'select')
   */
  controlColumnIds?: string[];
  /**
   * Row height from state
   */
  rowHeightState?: number;
  /**
   * Update row height state
   */
  onUpdateRowHeight?: (rowHeight: number) => void;
  /**
   * Is text base lang mode enabled
   */
  isPlainRecord?: boolean;
  /**
   * Current state value for rowsPerPage
   */
  rowsPerPageState?: number;
  /**
   * Update rows per page state
   */
  onUpdateRowsPerPage?: (rowsPerPage: number) => void;
  /**
   * Callback to execute on edit runtime field
   */
  onFieldEdited?: () => void;
  /**
   * Optional triggerId to retrieve the column cell actions that will override the default ones
   */
  cellActionsTriggerId?: string;
  /**
   * Service dependencies
   */
  services: {
    core: CoreStart;
    fieldFormats: FieldFormatsStart;
    addBasePath: HttpStart['basePath']['prepend'];
    uiSettings: IUiSettingsClient;
    dataViewFieldEditor: DataViewFieldEditorStart;
    toastNotifications: ToastsStart;
    storage: Storage;
  };
  getDocumentView?: (
    displayedRows: DataTableRecord[],
    displayedColumns: string[]
  ) => JSX.Element | undefined;
  configRowHeight?: number;
  showMultiFields?: boolean;
  maxDocFieldsDisplayed?: number;
}
export const EuiDataGridMemoized = React.memo(EuiDataGrid);

const CONTROL_COLUMN_IDS_DEFAULT = ['openDetails', 'select'];

export const UnifiedDataTable = ({
  ariaLabelledBy,
  columnsIds,
  controlColumnIds = CONTROL_COLUMN_IDS_DEFAULT,
  dataView,
  isLoading,
  onFilter,
  onResize,
  onSetColumns,
  onSort,
  rows,
  sampleSize,
  searchDescription,
  searchTitle,
  settings,
  showTimeCol,
  showFullScreenButton = true,
  sort,
  useNewFieldsApi,
  isSortEnabled = true,
  isPaginationEnabled = true,
  cellActionsTriggerId,
  className,
  rowHeightState,
  onUpdateRowHeight,
  isPlainRecord = false,
  rowsPerPageState,
  onUpdateRowsPerPage,
  onFieldEdited,
  services,
  leadingControlColumns,
  renderCustomGridBody,
  trailingControlColumns,
  getDocumentView,
  setExpandedDoc,
  expandedDoc,
  configRowHeight,
  showMultiFields = true,
  maxDocFieldsDisplayed = Number.MAX_SAFE_INTEGER,
}: UnifiedDataTableProps & Partial<EuiDataGridProps>) => {
  const { fieldFormats, toastNotifications, dataViewFieldEditor, uiSettings, storage } = services;
  const { darkMode } = useObservable(services.core.theme?.theme$ ?? of(themeDefault), themeDefault);
  const dataGridRef = useRef<EuiDataGridRefProps>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const displayedColumns = getDisplayedColumns(columnsIds, dataView);
  const defaultColumns = displayedColumns.includes('_source');
  const usedSelectedDocs = useMemo(() => {
    if (!selectedDocs.length || !rows?.length) {
      return [];
    }
    const idMap = rows.reduce((map, row) => map.set(row.id, true), new Map());
    // filter out selected docs that are no longer part of the current data
    const result = selectedDocs.filter((docId) => idMap.get(docId));
    if (result.length === 0 && isFilterActive) {
      setIsFilterActive(false);
    }
    return result;
  }, [selectedDocs, rows, isFilterActive]);

  const displayedRows = useMemo(() => {
    if (!rows) {
      return [];
    }
    if (!isFilterActive || usedSelectedDocs.length === 0) {
      return rows;
    }
    const rowsFiltered = rows.filter((row) => usedSelectedDocs.includes(row.id));
    if (!rowsFiltered.length) {
      // in case the selected docs are no longer part of the sample of 500, show all docs
      return rows;
    }
    return rowsFiltered;
  }, [rows, usedSelectedDocs, isFilterActive]);

  const valueToStringConverter: ValueToStringConverter = useCallback(
    (rowIndex, columnId, options) => {
      return convertValueToString({
        rowIndex,
        rows: displayedRows,
        dataView,
        columnId,
        fieldFormats,
        options,
      });
    },
    [displayedRows, dataView, fieldFormats]
  );

  /**
   * Pagination
   */
  const currentPageSize =
    typeof rowsPerPageState === 'number' && rowsPerPageState > 0
      ? rowsPerPageState
      : DEFAULT_ROWS_PER_PAGE;
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: currentPageSize,
  });
  const rowCount = useMemo(() => (displayedRows ? displayedRows.length : 0), [displayedRows]);
  const pageCount = useMemo(
    () => Math.ceil(rowCount / pagination.pageSize),
    [rowCount, pagination]
  );

  const paginationObj = useMemo(() => {
    const onChangeItemsPerPage = (pageSize: number) => {
      onUpdateRowsPerPage?.(pageSize);
    };

    const onChangePage = (pageIndex: number) =>
      setPagination((paginationData) => ({ ...paginationData, pageIndex }));

    return isPaginationEnabled
      ? {
          onChangeItemsPerPage,
          onChangePage,
          pageIndex: pagination.pageIndex > pageCount - 1 ? 0 : pagination.pageIndex,
          pageSize: pagination.pageSize,
          pageSizeOptions: getRowsPerPageOptions(pagination.pageSize),
        }
      : undefined;
  }, [pagination, pageCount, isPaginationEnabled, onUpdateRowsPerPage]);

  const isOnLastPage = paginationObj ? paginationObj.pageIndex === pageCount - 1 : false;

  useEffect(() => {
    setPagination((paginationData) =>
      paginationData.pageSize === currentPageSize
        ? paginationData
        : { ...paginationData, pageSize: currentPageSize }
    );
  }, [currentPageSize, setPagination]);

  /**
   * Sorting
   */
  const sortingColumns = useMemo(() => sort.map(([id, direction]) => ({ id, direction })), [sort]);

  const [inmemorySortingColumns, setInmemorySortingColumns] = useState([]);
  const onTableSort = useCallback(
    (sortingColumnsData) => {
      if (isSortEnabled) {
        if (isPlainRecord) {
          setInmemorySortingColumns(sortingColumnsData);
        } else if (onSort) {
          onSort(sortingColumnsData.map(({ id, direction }: SortObj) => [id, direction]));
        }
      }
    },
    [onSort, isSortEnabled, isPlainRecord, setInmemorySortingColumns]
  );

  const shouldShowFieldHandler = useMemo(() => {
    const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
    return getShouldShowFieldHandler(dataViewFields, dataView, showMultiFields);
  }, [dataView, showMultiFields]);

  /**
   * Cell rendering
   */
  const renderCellValue = useMemo(
    () =>
      getRenderCellValueFn(
        dataView,
        displayedRows,
        useNewFieldsApi,
        shouldShowFieldHandler,
        () => dataGridRef.current?.closeCellPopover(),
        services.fieldFormats,
        maxDocFieldsDisplayed
      ),
    [
      dataView,
      displayedRows,
      useNewFieldsApi,
      shouldShowFieldHandler,
      maxDocFieldsDisplayed,
      services.fieldFormats,
    ]
  );

  /**
   * Render variables
   */
  const showDisclaimer = sampleSize && rowCount === sampleSize && isOnLastPage;
  const randomId = useMemo(() => htmlIdGenerator()(), []);
  const closeFieldEditor = useRef<() => void | undefined>();

  useEffect(() => {
    return () => {
      if (closeFieldEditor?.current) {
        closeFieldEditor?.current();
      }
    };
  }, []);

  const editField = useMemo(
    () =>
      onFieldEdited
        ? (fieldName: string) => {
            closeFieldEditor.current = services.dataViewFieldEditor.openEditor({
              ctx: {
                dataView,
              },
              fieldName,
              onSave: async () => {
                await onFieldEdited();
              },
            });
          }
        : undefined,
    [dataView, onFieldEdited, services.dataViewFieldEditor]
  );

  const visibleColumns = useMemo(
    () => getVisibleColumns(displayedColumns, dataView, showTimeCol) as string[],
    [dataView, displayedColumns, showTimeCol]
  );

  const getCellValue = useCallback<UseDataGridColumnsCellActionsProps['getCellValue']>(
    (fieldName, rowIndex) =>
      displayedRows[rowIndex % displayedRows.length].flattened[fieldName] as Serializable,
    [displayedRows]
  );

  const cellActionsFields = useMemo<UseDataGridColumnsCellActionsProps['fields']>(
    () =>
      cellActionsTriggerId && !isPlainRecord
        ? visibleColumns.map(
            (columnName) =>
              dataView.getFieldByName(columnName)?.toSpec() ?? {
                name: '',
                type: '',
                aggregatable: false,
                searchable: false,
              }
          )
        : undefined,
    [cellActionsTriggerId, isPlainRecord, visibleColumns, dataView]
  );

  const columnsCellActions = useDataGridColumnsCellActions({
    fields: cellActionsFields,
    getCellValue,
    triggerId: cellActionsTriggerId,
    dataGridRef,
  });

  const euiGridColumns = useMemo(
    () =>
      getEuiGridColumns({
        columns: visibleColumns,
        columnsCellActions,
        rowsCount: displayedRows.length,
        settings,
        dataView,
        defaultColumns,
        isSortEnabled,
        isPlainRecord,
        services: {
          uiSettings,
          toastNotifications,
        },
        hasEditDataViewPermission: () => dataViewFieldEditor.userPermissions.editIndexPattern(),
        valueToStringConverter,
        onFilter,
        editField,
      }),
    [
      onFilter,
      visibleColumns,
      columnsCellActions,
      displayedRows,
      dataView,
      settings,
      defaultColumns,
      isSortEnabled,
      isPlainRecord,
      uiSettings,
      toastNotifications,
      dataViewFieldEditor,
      valueToStringConverter,
      editField,
    ]
  );

  const hideTimeColumn = useMemo(
    () => services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
    [services.uiSettings]
  );
  const schemaDetectors = useMemo(() => getSchemaDetectors(), []);
  const columnsVisibility = useMemo(
    () => ({
      visibleColumns,
      setVisibleColumns: (newColumns: string[]) => {
        onSetColumns(newColumns, hideTimeColumn);
      },
    }),
    [visibleColumns, hideTimeColumn, onSetColumns]
  );
  const sorting = useMemo(() => {
    if (isSortEnabled) {
      return {
        columns: isPlainRecord ? inmemorySortingColumns : sortingColumns,
        onSort: onTableSort,
      };
    }
    return { columns: sortingColumns, onSort: () => {} };
  }, [isSortEnabled, sortingColumns, isPlainRecord, inmemorySortingColumns, onTableSort]);

  const DocumentView = getDocumentView;
  const canSetExpandedDoc = Boolean(setExpandedDoc && !!DocumentView);

  const lead = useMemo(
    () =>
      getLeadControlColumns(canSetExpandedDoc).filter(({ id }) => controlColumnIds.includes(id)),
    [controlColumnIds, canSetExpandedDoc]
  );

  const additionalControls = useMemo(
    () =>
      usedSelectedDocs.length ? (
        <DataTableDocumentToolbarBtn
          isFilterActive={isFilterActive}
          rows={rows!}
          selectedDocs={usedSelectedDocs}
          setSelectedDocs={setSelectedDocs}
          setIsFilterActive={setIsFilterActive}
        />
      ) : null,
    [usedSelectedDocs, isFilterActive, rows, setIsFilterActive]
  );

  const showDisplaySelector = useMemo(
    () =>
      !!onUpdateRowHeight
        ? {
            allowDensity: false,
            allowRowHeight: true,
          }
        : undefined,
    [onUpdateRowHeight]
  );

  const inMemory = useMemo(() => {
    return isPlainRecord ? ({ level: 'sorting' } as EuiDataGridInMemory) : undefined;
  }, [isPlainRecord]);

  const toolbarVisibility = useMemo(
    () =>
      defaultColumns
        ? {
            ...toolbarVisibilityDefaults,
            showColumnSelector: false,
            showSortSelector: isSortEnabled,
            additionalControls,
            showDisplaySelector,
            showFullScreenSelector: showFullScreenButton,
          }
        : {
            ...toolbarVisibilityDefaults,
            showSortSelector: isSortEnabled,
            additionalControls,
            showDisplaySelector,
            showFullScreenSelector: showFullScreenButton,
          },
    [defaultColumns, isSortEnabled, additionalControls, showDisplaySelector, showFullScreenButton]
  );

  const rowHeightsOptions = useRowHeightsOptions({
    rowHeightState,
    onUpdateRowHeight,
    storage,
    configRowHeight,
  });

  if (!rowCount && isLoading) {
    return (
      <div className="euiDataGrid__loading">
        <EuiText size="xs" color="subdued">
          <EuiLoadingSpinner />
          <EuiSpacer size="s" />
          <FormattedMessage id="unifiedDataTable.loadingResults" defaultMessage="Loading results" />
        </EuiText>
      </div>
    );
  }

  if (!rowCount) {
    return (
      <div
        className="euiDataGrid__noResults"
        data-render-complete={!isLoading}
        data-shared-item=""
        data-title={searchTitle}
        data-description={searchDescription}
        data-document-number={0}
      >
        <EuiText size="xs" color="subdued">
          <EuiIcon type="discoverApp" size="m" color="subdued" />
          <EuiSpacer size="s" />
          <FormattedMessage
            id="unifiedDataTable.noResultsFound"
            defaultMessage="No results found"
          />
        </EuiText>
      </div>
    );
  }

  return (
    <UnifiedDataTableContext.Provider
      value={{
        expanded: expandedDoc,
        setExpanded: setExpandedDoc,
        rows: displayedRows,
        onFilter,
        dataView,
        isDarkMode: darkMode,
        selectedDocs: usedSelectedDocs,
        setSelectedDocs: (newSelectedDocs) => {
          setSelectedDocs(newSelectedDocs);
          if (isFilterActive && newSelectedDocs.length === 0) {
            setIsFilterActive(false);
          }
        },
        valueToStringConverter,
      }}
    >
      <span className="udtDataTable__inner">
        <div
          data-test-subj="discoverDocTable"
          data-render-complete={!isLoading}
          data-shared-item=""
          data-title={searchTitle}
          data-description={searchDescription}
          data-document-number={displayedRows.length}
          className={classnames(className, 'udtDataTable__table')}
        >
          <EuiDataGridMemoized
            aria-describedby={randomId}
            aria-labelledby={ariaLabelledBy}
            columns={euiGridColumns}
            columnVisibility={columnsVisibility}
            data-test-subj="docTable"
            leadingControlColumns={leadingControlColumns ?? lead}
            onColumnResize={onResize}
            pagination={paginationObj}
            renderCellValue={renderCellValue}
            ref={dataGridRef}
            rowCount={rowCount}
            schemaDetectors={schemaDetectors}
            sorting={sorting as EuiDataGridSorting}
            toolbarVisibility={toolbarVisibility}
            rowHeightsOptions={rowHeightsOptions}
            inMemory={inMemory}
            gridStyle={GRID_STYLE}
            renderCustomGridBody={renderCustomGridBody}
            trailingControlColumns={trailingControlColumns}
          />
        </div>
        {showDisclaimer && (
          <p className="udtDataTable__footer" data-test-subj="unifiedDataTableFooter">
            <FormattedMessage
              id="unifiedDataTable.gridSampleSize.limitDescription"
              defaultMessage="Search results are limited to {sampleSize} documents. Add more search terms to narrow your search."
              values={{
                sampleSize,
              }}
            />
          </p>
        )}
        {searchTitle && (
          <EuiScreenReaderOnly>
            <p id={String(randomId)}>
              {searchDescription ? (
                <FormattedMessage
                  id="unifiedDataTable.searchGenerationWithDescriptionGrid"
                  defaultMessage="Table generated by search {searchTitle} ({searchDescription})"
                  values={{ searchTitle, searchDescription }}
                />
              ) : (
                <FormattedMessage
                  id="unifiedDataTable.searchGenerationWithDescription"
                  defaultMessage="Table generated by search {searchTitle}"
                  values={{ searchTitle }}
                />
              )}
            </p>
          </EuiScreenReaderOnly>
        )}
        {setExpandedDoc &&
          expandedDoc &&
          getDocumentView &&
          getDocumentView(displayedRows, displayedColumns)}
      </span>
    </UnifiedDataTableContext.Provider>
  );
};
