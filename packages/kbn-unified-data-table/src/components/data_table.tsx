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
  EuiDataGridControlColumn,
  EuiDataGridCustomBodyProps,
  EuiDataGridCustomToolbarProps,
  EuiDataGridToolBarVisibilityOptions,
  EuiDataGridToolBarVisibilityDisplaySelectorOptions,
  EuiDataGridStyle,
  EuiDataGridProps,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  useDataGridColumnsCellActions,
  type UseDataGridColumnsCellActionsProps,
} from '@kbn/cell-actions';
import type { ToastsStart, IUiSettingsClient } from '@kbn/core/public';
import type { Serializable } from '@kbn/utility-types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { getShouldShowFieldHandler } from '@kbn/discover-utils';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import {
  UnifiedDataTableSettings,
  ValueToStringConverter,
  DataTableColumnsMeta,
  CustomCellRenderer,
  CustomGridColumnsConfiguration,
  CustomControlColumnConfiguration,
} from '../types';
import { getDisplayedColumns } from '../utils/columns';
import { convertValueToString } from '../utils/convert_value_to_string';
import { getRowsPerPageOptions } from '../utils/rows_per_page';
import { getRenderCellValueFn } from '../utils/get_render_cell_value';
import {
  getAllControlColumns,
  getEuiGridColumns,
  getLeadControlColumns,
  getVisibleColumns,
  canPrependTimeFieldColumn,
} from './data_table_columns';
import { UnifiedDataTableContext } from '../table_context';
import { getSchemaDetectors } from './data_table_schema';
import { DataTableDocumentToolbarBtn } from './data_table_document_selection';
import { useRowHeightsOptions } from '../hooks/use_row_heights_options';
import {
  DEFAULT_ROWS_PER_PAGE,
  GRID_STYLE,
  ROWS_HEIGHT_OPTIONS,
  toolbarVisibility as toolbarVisibilityDefaults,
} from '../constants';
import { UnifiedDataTableFooter } from './data_table_footer';
import { UnifiedDataTableAdditionalDisplaySettings } from './data_table_additional_display_settings';
import { useRowHeight } from '../hooks/use_row_height';
import { CompareDocuments } from './compare_documents';
import { useFullScreenWatcher } from '../hooks/use_full_screen_watcher';

export interface UnifiedDataTableRenderCustomToolbarProps {
  toolbarProps: EuiDataGridCustomToolbarProps;
  gridProps: {
    additionalControls?: EuiDataGridToolBarVisibilityOptions['additionalControls'];
  };
}

export type UnifiedDataTableRenderCustomToolbar = (
  props: UnifiedDataTableRenderCustomToolbarProps
) => React.ReactElement;

export type SortOrder = [string, string];

export enum DataLoadingState {
  loading = 'loading',
  loadingMore = 'loadingMore',
  loaded = 'loaded',
}

const themeDefault = { darkMode: false };

interface SortObj {
  id: string;
  direction: string;
}

/**
 * Unified Data Table props
 */
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
  columns: string[];
  /**
   * If not provided, types will be derived by default from the dataView field types.
   * For displaying text-based search results, pass columns meta (which are available separately in the fetch request) down here.
   * Check available utils in `utils/get_columns_meta.ts`
   */
  columnsMeta?: DataTableColumnsMeta;
  /**
   * Field tokens could be rendered in column header next to the field name.
   */
  showColumnTokens?: boolean;
  /**
   * Optional value for providing configuration setting for UnifiedDataTable header row height
   */
  configHeaderRowHeight?: number;
  /**
   * Determines number of rows of a column header
   */
  headerRowHeightState?: number;
  /**
   * Update header row height state
   */
  onUpdateHeaderRowHeight?: (headerRowHeight: number) => void;
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
  loadingState: DataLoadingState;
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
   * Function to set the expanded document, which is displayed in a flyout
   */
  setExpandedDoc?: (doc?: DataTableRecord) => void;
  /**
   * Grid display settings persisted in Elasticsearch (e.g. column width)
   */
  settings?: UnifiedDataTableSettings;
  /**
   * Search description
   */
  searchDescription?: string;
  /**
   * Search title
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
   * Optional value for providing configuration setting for UnifiedDataTable row height
   */
  configRowHeight?: number;
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
   * Configuration option to limit sample size slider
   */
  maxAllowedSampleSize?: number;
  /**
   * The max size of the documents returned by Elasticsearch
   */
  sampleSizeState: number;
  /**
   * Update rows per page state
   */
  onUpdateSampleSize?: (sampleSize: number) => void;
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
    theme: ThemeServiceStart;
    fieldFormats: FieldFormatsStart;
    uiSettings: IUiSettingsClient;
    dataViewFieldEditor: DataViewFieldEditorStart;
    toastNotifications: ToastsStart;
    storage: Storage;
    data: DataPublicPluginStart;
  };
  /**
   * Callback to render DocumentView when the document is expanded
   */
  renderDocumentView?: (
    hit: DataTableRecord,
    displayedRows: DataTableRecord[],
    displayedColumns: string[],
    columnsMeta?: DataTableColumnsMeta
  ) => JSX.Element | undefined;
  /**
   * Optional value for providing configuration setting for enabling to display the complex fields in the table. Default is true.
   */
  showMultiFields?: boolean;
  /**
   * Optional value for providing configuration setting for maximum number of document fields to display in the table. Default is 50.
   */
  maxDocFieldsDisplayed?: number;
  /**
   * Optional value for providing EuiDataGridControlColumn list of the additional leading control columns. UnifiedDataTable includes two control columns: Open Details and Select.
   */
  externalControlColumns?: EuiDataGridControlColumn[];
  /**
   * Number total hits from ES
   */
  totalHits?: number;
  /**
   * To fetch more
   */
  onFetchMoreRecords?: () => void;
  /**
   * Optional value for providing the additional controls available in the UnifiedDataTable toolbar to manage it's records or state. UnifiedDataTable includes Columns, Sorting and Bulk Actions.
   */
  externalAdditionalControls?: React.ReactNode;
  /**
   * Optional list of number type values to set custom UnifiedDataTable paging options to display the records per page.
   */
  rowsPerPageOptions?: number[];
  /**
   * An optional function called to completely customize and control the rendering of
   * EuiDataGrid's body and cell placement.  This can be used to, e.g. remove EuiDataGrid's
   * virtualization library, or roll your own.
   *
   * This component is **only** meant as an escape hatch for extremely custom use cases.
   *
   * Behind the scenes, this function is treated as a React component,
   * allowing hooks, context, and other React concepts to be used.
   * It receives #EuiDataGridCustomBodyProps as its only argument.
   */
  renderCustomGridBody?: (args: EuiDataGridCustomBodyProps) => React.ReactNode;
  /**
   * Optional render for the grid toolbar
   * @param toolbarProps
   * @param gridProps
   */
  renderCustomToolbar?: UnifiedDataTableRenderCustomToolbar;
  /**
   * Optional render for the grid toolbar when in comparison mode
   * @param toolbarProps
   * @param gridProps
   */
  renderCustomComparisonToolbar?: UnifiedDataTableRenderCustomToolbar;
  /**
   * An optional list of the EuiDataGridControlColumn type for setting trailing control columns standard for EuiDataGrid.
   */
  trailingControlColumns?: EuiDataGridControlColumn[];
  /**
   * An optional value for a custom number of the visible cell actions in the table. By default is up to 3.
   **/
  visibleCellActions?: number;
  /**
   * An optional settings for a specified fields rendering like links. Applied only for the listed fields rendering.
   */
  externalCustomRenderers?: CustomCellRenderer;
  /**
   * An optional settings for customising the column
   */
  customGridColumnsConfiguration?: CustomGridColumnsConfiguration;
  /**
   * An optional settings to control which columns to render as trailing and leading control columns
   */
  customControlColumnsConfiguration?: CustomControlColumnConfiguration;
  /**
   * Name of the UnifiedDataTable consumer component or application
   */
  consumer?: string;
  /**
   * Optional key/value pairs to set guided onboarding steps ids for a data table components included to guided tour.
   */
  componentsTourSteps?: Record<string, string>;
  /**
   * Optional gridStyle override.
   */
  gridStyleOverride?: EuiDataGridStyle;
  /**
   * Optional row line height override. Default is 1.6em.
   */
  rowLineHeightOverride?: string;
}

export const EuiDataGridMemoized = React.memo(EuiDataGrid);

const CONTROL_COLUMN_IDS_DEFAULT = ['openDetails', 'select'];

export const UnifiedDataTable = ({
  ariaLabelledBy,
  columns,
  columnsMeta,
  showColumnTokens,
  configHeaderRowHeight,
  headerRowHeightState,
  onUpdateHeaderRowHeight,
  controlColumnIds = CONTROL_COLUMN_IDS_DEFAULT,
  dataView,
  loadingState,
  onFilter,
  onResize,
  onSetColumns,
  onSort,
  rows,
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
  maxAllowedSampleSize,
  sampleSizeState,
  onUpdateSampleSize,
  isPlainRecord = false,
  rowsPerPageState,
  onUpdateRowsPerPage,
  onFieldEdited,
  services,
  renderCustomGridBody,
  renderCustomToolbar,
  renderCustomComparisonToolbar,
  trailingControlColumns,
  totalHits,
  onFetchMoreRecords,
  renderDocumentView,
  setExpandedDoc,
  expandedDoc,
  configRowHeight,
  showMultiFields = true,
  maxDocFieldsDisplayed = 50,
  externalControlColumns,
  externalAdditionalControls,
  rowsPerPageOptions,
  visibleCellActions,
  externalCustomRenderers,
  consumer = 'discover',
  componentsTourSteps,
  gridStyleOverride,
  rowLineHeightOverride,
  customGridColumnsConfiguration,
  customControlColumnsConfiguration,
}: UnifiedDataTableProps) => {
  const { fieldFormats, toastNotifications, dataViewFieldEditor, uiSettings, storage, data } =
    services;
  const { darkMode } = useObservable(services.theme?.theme$ ?? of(themeDefault), themeDefault);
  const dataGridRef = useRef<EuiDataGridRefProps>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [isCompareActive, setIsCompareActive] = useState(false);
  const displayedColumns = getDisplayedColumns(columns, dataView);
  const defaultColumns = displayedColumns.includes('_source');
  const docMap = useMemo(() => new Map(rows?.map((row) => [row.id, row]) ?? []), [rows]);
  const getDocById = useCallback((id: string) => docMap.get(id), [docMap]);
  const usedSelectedDocs = useMemo(() => {
    if (!selectedDocs.length || !rows?.length) {
      return [];
    }
    // filter out selected docs that are no longer part of the current data
    const result = selectedDocs.filter((docId) => !!getDocById(docId));
    if (result.length === 0 && isFilterActive) {
      setIsFilterActive(false);
    }
    return result;
  }, [selectedDocs, rows?.length, isFilterActive, getDocById]);

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

  const unifiedDataTableContextValue = useMemo(
    () => ({
      expanded: expandedDoc,
      setExpanded: setExpandedDoc,
      rows: displayedRows,
      onFilter,
      dataView,
      isDarkMode: darkMode,
      selectedDocs: usedSelectedDocs,
      setSelectedDocs: (newSelectedDocs: React.SetStateAction<string[]>) => {
        setSelectedDocs(newSelectedDocs);
        if (isFilterActive && newSelectedDocs.length === 0) {
          setIsFilterActive(false);
        }
      },
      valueToStringConverter,
      componentsTourSteps,
    }),
    [
      componentsTourSteps,
      darkMode,
      dataView,
      displayedRows,
      expandedDoc,
      isFilterActive,
      onFilter,
      setExpandedDoc,
      usedSelectedDocs,
      valueToStringConverter,
    ]
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
          pageSizeOptions: rowsPerPageOptions ?? getRowsPerPageOptions(pagination.pageSize),
        }
      : undefined;
  }, [
    isPaginationEnabled,
    pagination.pageIndex,
    pagination.pageSize,
    pageCount,
    rowsPerPageOptions,
    onUpdateRowsPerPage,
  ]);

  useEffect(() => {
    setPagination((paginationData) =>
      paginationData.pageSize === currentPageSize
        ? paginationData
        : { ...paginationData, pageSize: currentPageSize }
    );
  }, [currentPageSize, setPagination]);

  const shouldShowFieldHandler = useMemo(() => {
    const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
    return getShouldShowFieldHandler(dataViewFields, dataView, showMultiFields);
  }, [dataView, showMultiFields]);

  /**
   * Cell rendering
   */
  const renderCellValue = useMemo(
    () =>
      getRenderCellValueFn({
        dataView,
        rows: displayedRows,
        useNewFieldsApi,
        shouldShowFieldHandler,
        closePopover: () => dataGridRef.current?.closeCellPopover(),
        fieldFormats: services.fieldFormats,
        maxEntries: maxDocFieldsDisplayed,
        externalCustomRenderers,
        isPlainRecord,
      }),
    [
      dataView,
      displayedRows,
      useNewFieldsApi,
      shouldShowFieldHandler,
      maxDocFieldsDisplayed,
      services.fieldFormats,
      externalCustomRenderers,
      isPlainRecord,
    ]
  );

  /**
   * Render variables
   */
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

  const timeFieldName = dataView.timeFieldName;
  const shouldPrependTimeFieldColumn = useCallback(
    (activeColumns: string[]) =>
      canPrependTimeFieldColumn(
        activeColumns,
        timeFieldName,
        columnsMeta,
        showTimeCol,
        isPlainRecord
      ),
    [timeFieldName, isPlainRecord, showTimeCol, columnsMeta]
  );

  const visibleColumns = useMemo(
    () =>
      getVisibleColumns(displayedColumns, dataView, shouldPrependTimeFieldColumn(displayedColumns)),
    [dataView, displayedColumns, shouldPrependTimeFieldColumn]
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
  const cellActionsMetadata = useMemo(() => ({ dataViewId: dataView.id }), [dataView]);

  const columnsCellActions = useDataGridColumnsCellActions({
    fields: cellActionsFields,
    getCellValue,
    triggerId: cellActionsTriggerId,
    dataGridRef,
    metadata: cellActionsMetadata,
  });

  const {
    rowHeight: headerRowHeight,
    rowHeightLines: headerRowHeightLines,
    onChangeRowHeight: onChangeHeaderRowHeight,
    onChangeRowHeightLines: onChangeHeaderRowHeightLines,
  } = useRowHeight({
    storage,
    consumer,
    key: 'dataGridHeaderRowHeight',
    configRowHeight: configHeaderRowHeight ?? 1,
    rowHeightState: headerRowHeightState,
    onUpdateRowHeight: onUpdateHeaderRowHeight,
  });

  const { rowHeight, rowHeightLines, onChangeRowHeight, onChangeRowHeightLines } = useRowHeight({
    storage,
    consumer,
    key: 'dataGridRowHeight',
    configRowHeight: configRowHeight ?? ROWS_HEIGHT_OPTIONS.default,
    rowHeightState,
    onUpdateRowHeight,
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
        visibleCellActions,
        columnsMeta,
        showColumnTokens,
        headerRowHeightLines,
        customGridColumnsConfiguration,
      }),
    [
      columnsMeta,
      columnsCellActions,
      customGridColumnsConfiguration,
      dataView,
      dataViewFieldEditor,
      defaultColumns,
      displayedRows.length,
      editField,
      headerRowHeightLines,
      isPlainRecord,
      isSortEnabled,
      onFilter,
      settings,
      showColumnTokens,
      toastNotifications,
      uiSettings,
      valueToStringConverter,
      visibleCellActions,
      visibleColumns,
    ]
  );

  const schemaDetectors = useMemo(() => getSchemaDetectors(), []);
  const columnsVisibility = useMemo(
    () => ({
      visibleColumns,
      setVisibleColumns: (newColumns: string[]) => {
        const dontModifyColumns = !shouldPrependTimeFieldColumn(newColumns);
        onSetColumns(newColumns, dontModifyColumns);
      },
    }),
    [visibleColumns, onSetColumns, shouldPrependTimeFieldColumn]
  );

  /**
   * Sorting
   */
  const sortingColumns = useMemo(
    () =>
      sort
        .map(([id, direction]) => ({ id, direction }))
        .filter(({ id }) => visibleColumns.includes(id)),
    [sort, visibleColumns]
  );

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

  const sorting = useMemo(() => {
    if (isSortEnabled) {
      return {
        columns: isPlainRecord ? inmemorySortingColumns : sortingColumns,
        onSort: onTableSort,
      };
    }
    return {
      columns: sortingColumns,
      onSort: () => {},
    };
  }, [isSortEnabled, sortingColumns, isPlainRecord, inmemorySortingColumns, onTableSort]);

  const canSetExpandedDoc = Boolean(setExpandedDoc && !!renderDocumentView);

  const leadingControlColumns: EuiDataGridControlColumn[] = useMemo(() => {
    const internalControlColumns = getLeadControlColumns(canSetExpandedDoc).filter(({ id }) =>
      controlColumnIds.includes(id)
    );
    return externalControlColumns
      ? [...internalControlColumns, ...externalControlColumns]
      : internalControlColumns;
  }, [canSetExpandedDoc, controlColumnIds, externalControlColumns]);

  const controlColumnsConfig = customControlColumnsConfiguration?.({
    controlColumns: getAllControlColumns(),
  });

  const customLeadingControlColumn =
    controlColumnsConfig?.leadingControlColumns ?? leadingControlColumns;
  const customTrailingControlColumn =
    controlColumnsConfig?.trailingControlColumns ?? trailingControlColumns;

  const additionalControls = useMemo(() => {
    if (!externalAdditionalControls && !usedSelectedDocs.length) {
      return null;
    }

    return (
      <>
        {usedSelectedDocs.length ? (
          <DataTableDocumentToolbarBtn
            isFilterActive={isFilterActive}
            rows={rows!}
            selectedDocs={usedSelectedDocs}
            setSelectedDocs={setSelectedDocs}
            setIsFilterActive={setIsFilterActive}
            setIsCompareActive={setIsCompareActive}
          />
        ) : null}
        {externalAdditionalControls}
      </>
    );
  }, [usedSelectedDocs, isFilterActive, rows, externalAdditionalControls]);

  const renderCustomToolbarFn: EuiDataGridProps['renderCustomToolbar'] | undefined = useMemo(
    () =>
      renderCustomToolbar
        ? (toolbarProps) =>
            renderCustomToolbar({
              toolbarProps,
              gridProps: {
                additionalControls,
              },
            })
        : undefined,
    [renderCustomToolbar, additionalControls]
  );

  const showDisplaySelector = useMemo(() => {
    const options: EuiDataGridToolBarVisibilityDisplaySelectorOptions = {};

    if (onUpdateRowHeight) {
      options.allowDensity = false;
    }

    if (onUpdateRowHeight || onUpdateHeaderRowHeight || onUpdateSampleSize) {
      options.allowRowHeight = false;
      options.allowResetButton = false;
      options.additionalDisplaySettings = (
        <UnifiedDataTableAdditionalDisplaySettings
          rowHeight={rowHeight}
          rowHeightLines={rowHeightLines}
          onChangeRowHeight={onChangeRowHeight}
          onChangeRowHeightLines={onChangeRowHeightLines}
          headerRowHeight={headerRowHeight}
          headerRowHeightLines={headerRowHeightLines}
          onChangeHeaderRowHeight={onChangeHeaderRowHeight}
          onChangeHeaderRowHeightLines={onChangeHeaderRowHeightLines}
          maxAllowedSampleSize={maxAllowedSampleSize}
          sampleSize={sampleSizeState}
          onChangeSampleSize={onUpdateSampleSize}
        />
      );
    }

    return Object.keys(options).length ? options : undefined;
  }, [
    headerRowHeight,
    headerRowHeightLines,
    maxAllowedSampleSize,
    onChangeHeaderRowHeight,
    onChangeHeaderRowHeightLines,
    onChangeRowHeight,
    onChangeRowHeightLines,
    onUpdateHeaderRowHeight,
    onUpdateRowHeight,
    onUpdateSampleSize,
    rowHeight,
    rowHeightLines,
    sampleSizeState,
  ]);

  const inMemory = useMemo(() => {
    return isPlainRecord && columns.length
      ? ({ level: 'sorting' } as EuiDataGridInMemory)
      : undefined;
  }, [columns.length, isPlainRecord]);

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
    rowHeightLines,
    rowLineHeight: rowLineHeightOverride,
  });

  const { dataGridId, dataGridWrapper, setDataGridWrapper } = useFullScreenWatcher();

  const isRenderComplete = loadingState !== DataLoadingState.loading;

  if (!rowCount && loadingState === DataLoadingState.loading) {
    return (
      <div className="euiDataGrid__loading" data-test-subj="unifiedDataTableLoading">
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
        data-render-complete={isRenderComplete}
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
    <UnifiedDataTableContext.Provider value={unifiedDataTableContextValue}>
      <span className="unifiedDataTable__inner">
        <div
          ref={setDataGridWrapper}
          key={isCompareActive ? 'comparisonTable' : 'docTable'}
          data-test-subj="discoverDocTable"
          data-render-complete={isRenderComplete}
          data-shared-item=""
          data-title={searchTitle}
          data-description={searchDescription}
          data-document-number={displayedRows.length}
          className={classnames(className, 'unifiedDataTable__table')}
        >
          {isCompareActive ? (
            <CompareDocuments
              id={dataGridId}
              wrapper={dataGridWrapper}
              consumer={consumer}
              ariaDescribedBy={randomId}
              ariaLabelledBy={ariaLabelledBy}
              dataView={dataView}
              isPlainRecord={isPlainRecord}
              selectedFieldNames={visibleColumns}
              selectedDocs={usedSelectedDocs}
              schemaDetectors={schemaDetectors}
              forceShowAllFields={defaultColumns}
              showFullScreenButton={showFullScreenButton}
              fieldFormats={fieldFormats}
              getDocById={getDocById}
              setSelectedDocs={setSelectedDocs}
              setIsCompareActive={setIsCompareActive}
              renderCustomToolbar={renderCustomComparisonToolbar}
            />
          ) : (
            <EuiDataGridMemoized
              id={dataGridId}
              aria-describedby={randomId}
              aria-labelledby={ariaLabelledBy}
              columns={euiGridColumns}
              columnVisibility={columnsVisibility}
              data-test-subj="docTable"
              leadingControlColumns={customLeadingControlColumn}
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
              gridStyle={gridStyleOverride ?? GRID_STYLE}
              renderCustomGridBody={renderCustomGridBody}
              renderCustomToolbar={renderCustomToolbarFn}
              trailingControlColumns={customTrailingControlColumn}
            />
          )}
        </div>
        {loadingState !== DataLoadingState.loading &&
          !usedSelectedDocs.length && // hide footer when showing selected documents
          isPaginationEnabled &&
          !isCompareActive && ( // we hide the footer for Surrounding Documents page
            <UnifiedDataTableFooter
              isLoadingMore={loadingState === DataLoadingState.loadingMore}
              rowCount={rowCount}
              sampleSize={sampleSizeState}
              pageCount={pageCount}
              pageIndex={paginationObj?.pageIndex}
              totalHits={totalHits}
              onFetchMoreRecords={onFetchMoreRecords}
              data={data}
              fieldFormats={fieldFormats}
            />
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
        {canSetExpandedDoc &&
          expandedDoc &&
          renderDocumentView!(expandedDoc, displayedRows, displayedColumns, columnsMeta)}
      </span>
    </UnifiedDataTableContext.Provider>
  );
};
