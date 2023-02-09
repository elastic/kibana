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
import './discover_grid.scss';
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
  EuiLink,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { Filter } from '@kbn/es-query';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ToastsStart, IUiSettingsClient, HttpStart } from '@kbn/core/public';
import { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { DocViewFilterFn } from '../../services/doc_views/doc_views_types';
import { getSchemaDetectors } from './discover_grid_schema';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { DiscoverGridContext } from './discover_grid_context';
import { getRenderCellValueFn } from './get_render_cell_value';
import { DiscoverGridSettings } from './types';
import {
  getEuiGridColumns,
  getLeadControlColumns,
  getVisibleColumns,
} from './discover_grid_columns';
import { GRID_STYLE, toolbarVisibility as toolbarVisibilityDefaults } from './constants';
import { getDisplayedColumns } from '../../utils/columns';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  SAMPLE_SIZE_SETTING,
  MAX_DOC_FIELDS_DISPLAYED,
  SHOW_MULTIFIELDS,
} from '../../../common';
import { DiscoverGridDocumentToolbarBtn } from './discover_grid_document_selection';
import { getShouldShowFieldHandler } from '../../utils/get_should_show_field_handler';
import type { DataTableRecord, ValueToStringConverter } from '../../types';
import { useRowHeightsOptions } from '../../hooks/use_row_heights_options';
import { convertValueToString } from '../../utils/convert_value_to_string';
import { getRowsPerPageOptions, getDefaultRowsPerPage } from '../../utils/rows_per_page';

interface SortObj {
  id: string;
  direction: string;
}

export interface DiscoverGridProps {
  /**
   * Determines which element labels the grid for ARIA
   */
  ariaLabelledBy: string;
  /**
   * Optional class name to apply
   */
  className?: string;
  /**
   * Determines which columns are displayed
   */
  columns: string[];
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
   * Function used to add a column in the document flyout
   */
  onAddColumn: (column: string) => void;
  /**
   * Function to add a filter in the grid cell or document flyout
   */
  onFilter: DocViewFilterFn;
  /**
   * Function used in the grid header and flyout to remove a column
   * @param column
   */
  onRemoveColumn: (column: string) => void;
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
  sampleSize: number;
  /**
   * Function to set the expanded document, which is displayed in a flyout
   */
  setExpandedDoc?: (doc?: DataTableRecord) => void;
  /**
   * Grid display settings persisted in Elasticsearch (e.g. column width)
   */
  settings?: DiscoverGridSettings;
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
   * Filters applied by saved search embeddable
   */
  filters?: Filter[];
  /**
   * Saved search id used for links to single doc and surrounding docs in the flyout
   */
  savedSearchId?: string;
  /**
   * Document detail view component
   */
  DocumentView?: typeof DiscoverGridFlyout;
  /**
   * Service dependencies
   */
  services: {
    fieldFormats: FieldFormatsStart;
    addBasePath: HttpStart['basePath']['prepend'];
    uiSettings: IUiSettingsClient;
    dataViewFieldEditor: DataViewFieldEditorStart;
    toastNotifications: ToastsStart;
  };
}

export const EuiDataGridMemoized = React.memo(EuiDataGrid);

const CONTROL_COLUMN_IDS_DEFAULT = ['openDetails', 'select'];

export const DiscoverGrid = ({
  ariaLabelledBy,
  columns,
  dataView,
  isLoading,
  expandedDoc,
  onAddColumn,
  filters,
  savedSearchId,
  onFilter,
  onRemoveColumn,
  onResize,
  onSetColumns,
  onSort,
  rows,
  sampleSize,
  searchDescription,
  searchTitle,
  setExpandedDoc,
  settings,
  showTimeCol,
  sort,
  useNewFieldsApi,
  isSortEnabled = true,
  isPaginationEnabled = true,
  controlColumnIds = CONTROL_COLUMN_IDS_DEFAULT,
  className,
  rowHeightState,
  onUpdateRowHeight,
  isPlainRecord = false,
  rowsPerPageState,
  onUpdateRowsPerPage,
  onFieldEdited,
  DocumentView,
  services,
}: DiscoverGridProps) => {
  const { fieldFormats, toastNotifications, dataViewFieldEditor, uiSettings } = services;
  const dataGridRef = useRef<EuiDataGridRefProps>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const displayedColumns = getDisplayedColumns(columns, dataView);
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
  const defaultRowsPerPage = useMemo(
    () => getDefaultRowsPerPage(services.uiSettings),
    [services.uiSettings]
  );
  const currentPageSize =
    typeof rowsPerPageState === 'number' && rowsPerPageState > 0
      ? rowsPerPageState
      : defaultRowsPerPage;
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

  const onTableSort = useCallback(
    (sortingColumnsData) => {
      if (isSortEnabled && onSort) {
        onSort(sortingColumnsData.map(({ id, direction }: SortObj) => [id, direction]));
      }
    },
    [onSort, isSortEnabled]
  );

  const showMultiFields = services.uiSettings.get(SHOW_MULTIFIELDS);

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
        services.uiSettings.get(MAX_DOC_FIELDS_DISPLAYED),
        () => dataGridRef.current?.closeCellPopover()
      ),
    [dataView, displayedRows, useNewFieldsApi, shouldShowFieldHandler, services.uiSettings]
  );

  /**
   * Render variables
   */
  const showDisclaimer = rowCount === sampleSize && isOnLastPage;
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

  const euiGridColumns = useMemo(
    () =>
      getEuiGridColumns({
        columns: displayedColumns,
        rowsCount: displayedRows.length,
        settings,
        dataView,
        showTimeCol,
        defaultColumns,
        isSortEnabled,
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
      displayedColumns,
      displayedRows,
      dataView,
      showTimeCol,
      settings,
      defaultColumns,
      isSortEnabled,
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
      visibleColumns: getVisibleColumns(displayedColumns, dataView, showTimeCol) as string[],
      setVisibleColumns: (newColumns: string[]) => {
        onSetColumns(newColumns, hideTimeColumn);
      },
    }),
    [displayedColumns, dataView, showTimeCol, hideTimeColumn, onSetColumns]
  );
  const sorting = useMemo(() => {
    if (isSortEnabled) {
      return { columns: sortingColumns, onSort: onTableSort };
    }
    return { columns: sortingColumns, onSort: () => {} };
  }, [sortingColumns, onTableSort, isSortEnabled]);

  const canSetExpandedDoc = Boolean(setExpandedDoc && DocumentView);

  const lead = useMemo(
    () =>
      getLeadControlColumns(canSetExpandedDoc).filter(({ id }) => controlColumnIds.includes(id)),
    [controlColumnIds, canSetExpandedDoc]
  );

  const additionalControls = useMemo(
    () =>
      usedSelectedDocs.length ? (
        <DiscoverGridDocumentToolbarBtn
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

  const toolbarVisibility = useMemo(
    () =>
      defaultColumns
        ? {
            ...toolbarVisibilityDefaults,
            showColumnSelector: false,
            showSortSelector: isSortEnabled,
            additionalControls,
            showDisplaySelector,
          }
        : {
            ...toolbarVisibilityDefaults,
            showSortSelector: isSortEnabled,
            additionalControls,
            showDisplaySelector,
          },
    [showDisplaySelector, defaultColumns, additionalControls, isSortEnabled]
  );

  const rowHeightsOptions = useRowHeightsOptions({
    rowHeightState,
    onUpdateRowHeight,
  });

  if (!rowCount && isLoading) {
    return (
      <div className="euiDataGrid__loading">
        <EuiText size="xs" color="subdued">
          <EuiLoadingSpinner />
          <EuiSpacer size="s" />
          <FormattedMessage id="discover.loadingResults" defaultMessage="Loading results" />
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
          <FormattedMessage id="discover.noResultsFound" defaultMessage="No results found" />
        </EuiText>
      </div>
    );
  }

  return (
    <DiscoverGridContext.Provider
      value={{
        expanded: expandedDoc,
        setExpanded: setExpandedDoc,
        rows: displayedRows,
        onFilter,
        dataView,
        isDarkMode: services.uiSettings.get('theme:darkMode'),
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
      <span className="dscDiscoverGrid__inner">
        <div
          data-test-subj="discoverDocTable"
          data-render-complete={!isLoading}
          data-shared-item=""
          data-title={searchTitle}
          data-description={searchDescription}
          data-document-number={displayedRows.length}
          className={classnames(
            className,
            'dscDiscoverGrid__table',
            isPlainRecord ? 'dscDiscoverGrid__textLanguageMode' : 'dscDiscoverGrid__documentsMode'
          )}
        >
          <EuiDataGridMemoized
            aria-describedby={randomId}
            aria-labelledby={ariaLabelledBy}
            columns={euiGridColumns}
            columnVisibility={columnsVisibility}
            data-test-subj="docTable"
            leadingControlColumns={lead}
            onColumnResize={onResize}
            pagination={paginationObj}
            renderCellValue={renderCellValue}
            ref={dataGridRef}
            rowCount={rowCount}
            schemaDetectors={schemaDetectors}
            sorting={sorting as EuiDataGridSorting}
            toolbarVisibility={toolbarVisibility}
            rowHeightsOptions={rowHeightsOptions}
            gridStyle={GRID_STYLE}
          />
        </div>
        {showDisclaimer && (
          <p className="dscDiscoverGrid__footer" data-test-subj="discoverTableFooter">
            <FormattedMessage
              id="discover.gridSampleSize.description"
              defaultMessage="You're viewing the first {sampleSize} documents that match your search. To change this value, go to {advancedSettingsLink}."
              values={{
                sampleSize,
                advancedSettingsLink: (
                  <EuiLink
                    href={services.addBasePath(
                      `/app/management/kibana/settings?query=${SAMPLE_SIZE_SETTING}`
                    )}
                    data-test-subj="discoverTableSampleSizeSettingsLink"
                  >
                    <FormattedMessage
                      id="discover.gridSampleSize.advancedSettingsLinkLabel"
                      defaultMessage="Advanced Settings"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        )}
        {searchTitle && (
          <EuiScreenReaderOnly>
            <p id={String(randomId)}>
              {searchDescription ? (
                <FormattedMessage
                  id="discover.searchGenerationWithDescriptionGrid"
                  defaultMessage="Table generated by search {searchTitle} ({searchDescription})"
                  values={{ searchTitle, searchDescription }}
                />
              ) : (
                <FormattedMessage
                  id="discover.searchGenerationWithDescription"
                  defaultMessage="Table generated by search {searchTitle}"
                  values={{ searchTitle }}
                />
              )}
            </p>
          </EuiScreenReaderOnly>
        )}
        {setExpandedDoc && expandedDoc && DocumentView && (
          <DocumentView
            dataView={dataView}
            hit={expandedDoc}
            hits={displayedRows}
            // if default columns are used, dont make them part of the URL - the context state handling will take care to restore them
            columns={defaultColumns ? [] : displayedColumns}
            filters={filters}
            savedSearchId={savedSearchId}
            onFilter={onFilter}
            onRemoveColumn={onRemoveColumn}
            onAddColumn={onAddColumn}
            onClose={() => setExpandedDoc(undefined)}
            setExpandedDoc={setExpandedDoc}
          />
        )}
      </span>
    </DiscoverGridContext.Provider>
  );
};
