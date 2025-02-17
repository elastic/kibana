/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  EuiDataGridControlColumn,
  EuiDataGridCustomBodyProps,
  EuiDataGridStyle,
  EuiDataGridProps,
  EuiDataGridToolBarVisibilityDisplaySelectorOptions,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  useDataGridColumnsCellActions,
  type UseDataGridColumnsCellActionsProps,
} from '@kbn/cell-actions';
import type { ToastsStart, IUiSettingsClient } from '@kbn/core/public';
import type { Serializable } from '@kbn/utility-types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import {
  RowControlColumn,
  getShouldShowFieldHandler,
  canPrependTimeFieldColumn,
  getVisibleColumns,
} from '@kbn/discover-utils';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { AdditionalFieldGroups } from '@kbn/unified-field-list';
import { useDataGridInTableSearch } from '@kbn/data-grid-in-table-search';
import { DATA_GRID_DENSITY_STYLE_MAP, useDataGridDensity } from '../hooks/use_data_grid_density';
import {
  UnifiedDataTableSettings,
  ValueToStringConverter,
  DataTableColumnsMeta,
  CustomCellRenderer,
  CustomGridColumnsConfiguration,
} from '../types';
import { getDisplayedColumns } from '../utils/columns';
import { convertValueToString } from '../utils/convert_value_to_string';
import { getRowsPerPageOptions } from '../utils/rows_per_page';
import { getRenderCellValueFn } from '../utils/get_render_cell_value';
import {
  getEuiGridColumns,
  getLeadControlColumns,
  SELECT_ROW,
  OPEN_DETAILS,
} from './data_table_columns';
import { DataTableContext, UnifiedDataTableContext } from '../table_context';
import { getSchemaDetectors } from './data_table_schema';
import { DataTableDocumentToolbarBtn } from './data_table_document_selection';
import { useRowHeightsOptions } from '../hooks/use_row_heights_options';
import {
  DATA_GRID_STYLE_DEFAULT,
  DEFAULT_ROWS_PER_PAGE,
  ROWS_HEIGHT_OPTIONS,
  toolbarVisibility as toolbarVisibilityDefaults,
  DataGridDensity,
} from '../constants';
import { UnifiedDataTableFooter } from './data_table_footer';
import { UnifiedDataTableAdditionalDisplaySettings } from './data_table_additional_display_settings';
import { useRowHeight } from '../hooks/use_row_height';
import { CompareDocuments } from './compare_documents';
import { useFullScreenWatcher } from '../hooks/use_full_screen_watcher';
import { UnifiedDataTableRenderCustomToolbar } from './custom_toolbar/render_custom_toolbar';
import { getCustomCellPopoverRenderer } from '../utils/get_render_cell_popover';
import { useSelectedDocs } from '../hooks/use_selected_docs';
import {
  getColorIndicatorControlColumn,
  type ColorIndicatorControlColumnParams,
  getAdditionalRowControlColumns,
} from './custom_control_columns';
import { useSorting } from '../hooks/use_sorting';

const CONTROL_COLUMN_IDS_DEFAULT = [SELECT_ROW, OPEN_DETAILS];
const THEME_DEFAULT = { darkMode: false };
const VIRTUALIZATION_OPTIONS: EuiDataGridProps['virtualizationOptions'] = {
  // Allowing some additional rows to be rendered outside
  // the view minimizes pop-in when scrolling quickly
  overscanRowCount: 20,
};

export type SortOrder = [string, string];

export enum DataLoadingState {
  loading = 'loading',
  loadingMore = 'loadingMore',
  loaded = 'loaded',
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
   * Set to true to allow users to drag and drop columns for reordering
   */
  canDragAndDropColumns?: boolean;
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
  onFilter?: DocViewFilterFn;
  /**
   * Function triggered when a column is resized by the user, passes `undefined` for auto-width
   */
  onResize?: (colSettings: { columnId: string; width: number | undefined }) => void;
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
   * Determines whether the keyboard shortcuts button should be displayed
   */
  showKeyboardShortcuts?: boolean;
  /**
   * Manage user sorting control
   */
  isSortEnabled?: boolean;
  /**
   * Current sort setting
   */
  sort: SortOrder[];
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
   * Density from state
   */
  dataGridDensityState?: DataGridDensity;
  /**
   * Callback when the data grid density configuration is modified
   */
  onUpdateDataGridDensity?: (dataGridDensity: DataGridDensity) => void;
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
   *
   * this callback is triggered when user navigates to a different page
   *
   */
  onUpdatePageIndex?: (pageIndex: number) => void;
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
   * Service dependencies
   */
  services: {
    theme: ThemeServiceStart;
    fieldFormats: FieldFormatsStart;
    uiSettings: IUiSettingsClient;
    dataViewFieldEditor?: DataViewFieldEditorStart;
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
   * @deprecated Use only `rowAdditionalLeadingControls` instead
   * Optional value for providing EuiDataGridControlColumn list of the additional leading control columns. UnifiedDataTable includes two control columns: Open Details and Select.
   */
  externalControlColumns?: EuiDataGridControlColumn[];
  /**
   * An optional list of the EuiDataGridControlColumn type for setting trailing control columns standard for EuiDataGrid.
   * We recommend to rather position all controls in the beginning of rows and use `rowAdditionalLeadingControls` for that
   * as number of columns can be dynamically changed and we don't want the controls to become hidden due to horizontal scroll.
   */
  trailingControlColumns?: EuiDataGridControlColumn[];
  /**
   * Optional value to extend the list of default row actions
   */
  rowAdditionalLeadingControls?: RowControlColumn[];
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
   * Optional triggerId to retrieve the column cell actions that will override the default ones
   */
  cellActionsTriggerId?: string;
  /**
   * Custom set of properties used by some actions.
   * An action might require a specific set of metadata properties to render.
   * This data is sent directly to actions.
   */
  cellActionsMetadata?: Record<string, unknown>;
  /**
   * Controls whether the cell actions should replace the default cell actions or be appended to them
   */
  cellActionsHandling?: 'replace' | 'append';
  /**
   * An optional value for a custom number of the visible cell actions in the table. By default is up to 3.
   **/
  visibleCellActions?: number;
  /**
   * An optional settings for a specified fields rendering like links. Applied only for the listed fields rendering.
   */
  externalCustomRenderers?: CustomCellRenderer;
  /**
   * An optional prop to provide awareness of additional field groups when paired with the Unified Field List.
   */
  additionalFieldGroups?: AdditionalFieldGroups;
  /**
   * An optional settings for customising the column
   */
  customGridColumnsConfiguration?: CustomGridColumnsConfiguration;
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
  /**
   * Set to true to allow users to compare selected documents
   */
  enableComparisonMode?: boolean;
  /**
   * Set to true to allow users to search in cell values
   */
  enableInTableSearch?: boolean;
  /**
   * Optional extra props passed to the renderCellValue function/component.
   */
  cellContext?: EuiDataGridProps['cellContext'];
  /**
   *
   * Custom cell Popover Render Component.
   *
   */
  renderCellPopover?: EuiDataGridProps['renderCellPopover'];
  /**
   * When specified, this function will be called to determine the color of the row indicator.
   * @param row
   */
  getRowIndicator?: ColorIndicatorControlColumnParams['getRowIndicator'];
}

export const EuiDataGridMemoized = React.memo(EuiDataGrid);

export const UnifiedDataTable = ({
  ariaLabelledBy,
  columns,
  columnsMeta,
  showColumnTokens,
  canDragAndDropColumns,
  configHeaderRowHeight,
  headerRowHeightState,
  onUpdateHeaderRowHeight,
  controlColumnIds = CONTROL_COLUMN_IDS_DEFAULT,
  rowAdditionalLeadingControls,
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
  showKeyboardShortcuts = true,
  showFullScreenButton = true,
  sort,
  isSortEnabled = true,
  isPaginationEnabled = true,
  cellActionsTriggerId,
  cellActionsMetadata,
  cellActionsHandling = 'replace',
  visibleCellActions,
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
  externalControlColumns, // TODO: deprecate in favor of rowAdditionalLeadingControls
  trailingControlColumns, // TODO: deprecate in favor of rowAdditionalLeadingControls
  totalHits,
  onFetchMoreRecords,
  renderDocumentView,
  setExpandedDoc,
  expandedDoc,
  configRowHeight,
  showMultiFields = true,
  maxDocFieldsDisplayed = 50,
  externalAdditionalControls,
  rowsPerPageOptions,
  externalCustomRenderers,
  additionalFieldGroups,
  consumer = 'discover',
  componentsTourSteps,
  gridStyleOverride,
  rowLineHeightOverride,
  customGridColumnsConfiguration,
  enableComparisonMode,
  enableInTableSearch = false,
  cellContext,
  renderCellPopover,
  getRowIndicator,
  dataGridDensityState,
  onUpdateDataGridDensity,
  onUpdatePageIndex,
}: UnifiedDataTableProps) => {
  const { fieldFormats, toastNotifications, dataViewFieldEditor, uiSettings, storage, data } =
    services;
  const { darkMode } = useObservable(services.theme?.theme$ ?? of(THEME_DEFAULT), THEME_DEFAULT);
  const dataGridRef = useRef<EuiDataGridRefProps>(null);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [isCompareActive, setIsCompareActive] = useState(false);
  const displayedColumns = getDisplayedColumns(columns, dataView);
  const defaultColumns = displayedColumns.includes('_source');
  const docMap = useMemo(
    () =>
      new Map<string, { doc: DataTableRecord; docIndex: number }>(
        rows?.map((row, docIndex) => [row.id, { doc: row, docIndex }]) ?? []
      ),
    [rows]
  );
  const getDocById = useCallback((id: string) => docMap.get(id)?.doc, [docMap]);
  const selectedDocsState = useSelectedDocs(docMap);
  const {
    isDocSelected,
    hasSelectedDocs,
    selectedDocsCount,
    replaceSelectedDocs,
    docIdsInSelectionOrder,
  } = selectedDocsState;

  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const changeCurrentPageIndex = useCallback(
    (value: number) => {
      setCurrentPageIndex(value);
      onUpdatePageIndex?.(value);
    },
    [setCurrentPageIndex, onUpdatePageIndex]
  );

  useEffect(() => {
    if (!hasSelectedDocs && isFilterActive) {
      setIsFilterActive(false);
    }
  }, [isFilterActive, hasSelectedDocs, setIsFilterActive]);

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

  const visibleColumns = useMemo(() => {
    return getVisibleColumns(
      displayedColumns,
      dataView,
      shouldPrependTimeFieldColumn(displayedColumns)
    );
  }, [dataView, displayedColumns, shouldPrependTimeFieldColumn]);

  const { sortedRows, sorting } = useSorting({
    rows,
    visibleColumns,
    columnsMeta,
    sort,
    dataView,
    isPlainRecord,
    isSortEnabled,
    defaultColumns,
    onSort,
  });

  const displayedRows = useMemo(() => {
    if (!sortedRows) {
      return [];
    }

    if (!isFilterActive || !hasSelectedDocs) {
      return sortedRows;
    }

    const rowsFiltered = sortedRows.filter((row) => isDocSelected(row.id));

    return rowsFiltered.length
      ? rowsFiltered
      : // in case the selected docs are no longer part of the sample of 500, show all docs
        sortedRows;
  }, [sortedRows, isFilterActive, hasSelectedDocs, isDocSelected]);

  const valueToStringConverter: ValueToStringConverter = useCallback(
    (rowIndex, columnId, options) => {
      return convertValueToString({
        rowIndex,
        rows: displayedRows,
        dataView,
        columnId,
        fieldFormats,
        columnsMeta,
        options,
      });
    },
    [displayedRows, dataView, fieldFormats, columnsMeta]
  );

  /**
   * Pagination
   */
  const currentPageSize =
    typeof rowsPerPageState === 'number' && rowsPerPageState > 0
      ? rowsPerPageState
      : DEFAULT_ROWS_PER_PAGE;

  const rowCount = useMemo(() => (displayedRows ? displayedRows.length : 0), [displayedRows]);
  const pageCount = useMemo(
    () => Math.ceil(rowCount / currentPageSize),
    [rowCount, currentPageSize]
  );

  useEffect(() => {
    /**
     * Syncs any changes in pageIndex because of changes in pageCount
     * to the consumer.
     *
     */
    setCurrentPageIndex((previousPageIndex: number) => {
      const calculatedPageIndex = previousPageIndex > pageCount - 1 ? 0 : previousPageIndex;
      if (calculatedPageIndex !== previousPageIndex) {
        onUpdatePageIndex?.(calculatedPageIndex);
      }
      return calculatedPageIndex;
    });
  }, [onUpdatePageIndex, pageCount]);

  const paginationObj = useMemo(() => {
    const onChangeItemsPerPage = (pageSize: number) => {
      onUpdateRowsPerPage?.(pageSize);
    };

    return isPaginationEnabled
      ? {
          onChangeItemsPerPage,
          onChangePage: changeCurrentPageIndex,
          pageIndex: currentPageIndex,
          pageSize: currentPageSize,
          pageSizeOptions: rowsPerPageOptions ?? getRowsPerPageOptions(currentPageSize),
        }
      : undefined;
  }, [
    isPaginationEnabled,
    rowsPerPageOptions,
    onUpdateRowsPerPage,
    currentPageSize,
    currentPageIndex,
    changeCurrentPageIndex,
  ]);

  const unifiedDataTableContextValue = useMemo<DataTableContext>(
    () => ({
      expanded: expandedDoc,
      setExpanded: setExpandedDoc,
      getRowByIndex: (index: number) => displayedRows[index],
      onFilter,
      dataView,
      isDarkMode: darkMode,
      selectedDocsState,
      valueToStringConverter,
      componentsTourSteps,
      isPlainRecord,
      pageIndex: isPaginationEnabled ? paginationObj?.pageIndex : 0,
      pageSize: isPaginationEnabled ? paginationObj?.pageSize : displayedRows.length,
    }),
    [
      componentsTourSteps,
      darkMode,
      dataView,
      isPlainRecord,
      isPaginationEnabled,
      displayedRows,
      expandedDoc,
      onFilter,
      setExpandedDoc,
      selectedDocsState,
      paginationObj,
      valueToStringConverter,
    ]
  );

  const shouldShowFieldHandler = useMemo(() => {
    const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
    return getShouldShowFieldHandler(dataViewFields, dataView, showMultiFields);
  }, [dataView, showMultiFields]);

  const { dataGridDensity, onChangeDataGridDensity } = useDataGridDensity({
    storage,
    consumer,
    dataGridDensityState,
    onUpdateDataGridDensity,
  });

  const gridStyle = useMemo<EuiDataGridStyle>(
    () => ({
      ...DATA_GRID_STYLE_DEFAULT,
      ...DATA_GRID_DENSITY_STYLE_MAP[dataGridDensity],
      onChange: onChangeDataGridDensity,
      ...gridStyleOverride,
    }),
    [dataGridDensity, onChangeDataGridDensity, gridStyleOverride]
  );

  /**
   * Cell rendering
   */
  const renderCellValue = useMemo(
    () =>
      getRenderCellValueFn({
        dataView,
        rows: displayedRows,
        shouldShowFieldHandler,
        closePopover: () => dataGridRef.current?.closeCellPopover(),
        fieldFormats,
        maxEntries: maxDocFieldsDisplayed,
        externalCustomRenderers,
        isPlainRecord,
        isCompressed: dataGridDensity === DataGridDensity.COMPACT,
        columnsMeta,
      }),
    [
      dataView,
      displayedRows,
      shouldShowFieldHandler,
      maxDocFieldsDisplayed,
      fieldFormats,
      externalCustomRenderers,
      isPlainRecord,
      dataGridDensity,
      columnsMeta,
    ]
  );

  const { dataGridId, dataGridWrapper, setDataGridWrapper } = useFullScreenWatcher();

  const {
    inTableSearchTermCss,
    inTableSearchControl,
    cellContextWithInTableSearchSupport,
    renderCellValueWithInTableSearchSupport,
  } = useDataGridInTableSearch({
    enableInTableSearch,
    dataGridWrapper,
    dataGridRef,
    visibleColumns,
    rows: displayedRows,
    renderCellValue,
    cellContext,
    pagination: paginationObj,
  });

  const renderCustomPopover = useMemo(
    () => renderCellPopover ?? getCustomCellPopoverRenderer(),
    [renderCellPopover]
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
        ? async (fieldName: string) => {
            closeFieldEditor.current =
              onFieldEdited &&
              (await services?.dataViewFieldEditor?.openEditor({
                ctx: {
                  dataView,
                },
                fieldName,
                onSave: async () => {
                  await onFieldEdited();
                },
              }));
          }
        : undefined,
    [dataView, onFieldEdited, services?.dataViewFieldEditor]
  );

  const getCellValue = useCallback<UseDataGridColumnsCellActionsProps['getCellValue']>(
    (fieldName, rowIndex) =>
      displayedRows[rowIndex % displayedRows.length].flattened[fieldName] as Serializable,
    [displayedRows]
  );

  const cellActionsFields = useMemo<UseDataGridColumnsCellActionsProps['fields']>(
    () =>
      cellActionsTriggerId
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
    [cellActionsTriggerId, visibleColumns, dataView]
  );
  const allCellActionsMetadata = useMemo(
    () => ({ dataViewId: dataView.id, ...(cellActionsMetadata ?? {}) }),
    [dataView, cellActionsMetadata]
  );

  const columnsCellActions = useDataGridColumnsCellActions({
    fields: cellActionsFields,
    getCellValue,
    triggerId: cellActionsTriggerId,
    dataGridRef,
    metadata: allCellActionsMetadata,
  });

  const {
    rowHeight: headerRowHeight,
    rowHeightLines: headerRowHeightLines,
    lineCountInput: headerLineCountInput,
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

  const { rowHeight, rowHeightLines, lineCountInput, onChangeRowHeight, onChangeRowHeightLines } =
    useRowHeight({
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
        cellActionsHandling,
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
        hasEditDataViewPermission: () =>
          Boolean(dataViewFieldEditor?.userPermissions?.editIndexPattern()),
        valueToStringConverter,
        onFilter,
        editField,
        visibleCellActions,
        columnsMeta,
        showColumnTokens,
        headerRowHeightLines,
        customGridColumnsConfiguration,
        onResize,
      }),
    [
      cellActionsHandling,
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
      onResize,
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
      canDragAndDropColumns: defaultColumns ? false : canDragAndDropColumns,
      visibleColumns,
      setVisibleColumns: (newColumns: string[]) => {
        const dontModifyColumns = !shouldPrependTimeFieldColumn(newColumns);
        onSetColumns(newColumns, dontModifyColumns);
      },
    }),
    [
      visibleColumns,
      onSetColumns,
      shouldPrependTimeFieldColumn,
      canDragAndDropColumns,
      defaultColumns,
    ]
  );

  const canSetExpandedDoc = Boolean(setExpandedDoc && !!renderDocumentView);

  const leadingControlColumns: EuiDataGridControlColumn[] = useMemo(() => {
    const defaultControlColumns = getLeadControlColumns({ rows: displayedRows, canSetExpandedDoc });
    const internalControlColumns = controlColumnIds
      ? // reorder the default controls as per controlColumnIds
        controlColumnIds.reduce((acc, id) => {
          const controlColumn = defaultControlColumns.find((col) => col.id === id);
          if (controlColumn) {
            acc.push(controlColumn);
          }
          return acc;
        }, [] as EuiDataGridControlColumn[])
      : defaultControlColumns;

    const leadingColumns: EuiDataGridControlColumn[] = externalControlColumns
      ? [...internalControlColumns, ...externalControlColumns]
      : internalControlColumns;

    if (getRowIndicator) {
      const colorIndicatorControlColumn = getColorIndicatorControlColumn({
        getRowIndicator,
      });
      leadingColumns.unshift(colorIndicatorControlColumn);
    }

    if (rowAdditionalLeadingControls?.length) {
      leadingColumns.push(...getAdditionalRowControlColumns(rowAdditionalLeadingControls));
    }

    return leadingColumns;
  }, [
    canSetExpandedDoc,
    controlColumnIds,
    displayedRows,
    externalControlColumns,
    getRowIndicator,
    rowAdditionalLeadingControls,
  ]);

  const additionalControls = useMemo(() => {
    if (!externalAdditionalControls && !selectedDocsCount && !inTableSearchControl) {
      return null;
    }

    const leftControls = (
      <>
        {Boolean(selectedDocsCount) && (
          <DataTableDocumentToolbarBtn
            isPlainRecord={isPlainRecord}
            isFilterActive={isFilterActive}
            rows={rows!}
            setIsFilterActive={setIsFilterActive}
            selectedDocsState={selectedDocsState}
            enableComparisonMode={enableComparisonMode}
            setIsCompareActive={setIsCompareActive}
            fieldFormats={fieldFormats}
            pageIndex={unifiedDataTableContextValue.pageIndex}
            pageSize={unifiedDataTableContextValue.pageSize}
            toastNotifications={toastNotifications}
            columns={visibleColumns}
          />
        )}
        {externalAdditionalControls}
      </>
    );

    if (!renderCustomToolbar && inTableSearchControl) {
      return {
        left: leftControls,
        right: inTableSearchControl,
      };
    }

    return leftControls;
  }, [
    selectedDocsCount,
    selectedDocsState,
    externalAdditionalControls,
    isPlainRecord,
    isFilterActive,
    setIsFilterActive,
    enableComparisonMode,
    rows,
    fieldFormats,
    unifiedDataTableContextValue.pageIndex,
    unifiedDataTableContextValue.pageSize,
    toastNotifications,
    visibleColumns,
    renderCustomToolbar,
    inTableSearchControl,
  ]);

  const renderCustomToolbarFn: EuiDataGridProps['renderCustomToolbar'] | undefined = useMemo(
    () =>
      renderCustomToolbar
        ? (toolbarProps) =>
            renderCustomToolbar({
              toolbarProps,
              gridProps: {
                additionalControls:
                  additionalControls && 'left' in additionalControls
                    ? additionalControls.left
                    : additionalControls,
                inTableSearchControl,
              },
            })
        : undefined,
    [renderCustomToolbar, additionalControls, inTableSearchControl]
  );

  const showDisplaySelector = useMemo(():
    | EuiDataGridToolBarVisibilityDisplaySelectorOptions
    | undefined => {
    if (
      !onUpdateDataGridDensity &&
      !onUpdateRowHeight &&
      !onUpdateHeaderRowHeight &&
      !onUpdateSampleSize
    ) {
      return;
    }

    return {
      allowDensity: Boolean(onUpdateDataGridDensity),
      allowRowHeight: Boolean(onChangeRowHeight) || Boolean(onChangeHeaderRowHeight),
      allowResetButton: false,
      customRender: ({ densityControl }) => (
        <>
          <UnifiedDataTableAdditionalDisplaySettings
            rowHeight={rowHeight}
            onChangeRowHeight={onChangeRowHeight}
            onChangeRowHeightLines={onChangeRowHeightLines}
            headerRowHeight={headerRowHeight}
            onChangeHeaderRowHeight={onChangeHeaderRowHeight}
            onChangeHeaderRowHeightLines={onChangeHeaderRowHeightLines}
            maxAllowedSampleSize={maxAllowedSampleSize}
            sampleSize={sampleSizeState}
            onChangeSampleSize={onUpdateSampleSize}
            lineCountInput={lineCountInput}
            headerLineCountInput={headerLineCountInput}
            densityControl={densityControl}
          />
        </>
      ),
    };
  }, [
    headerRowHeight,
    maxAllowedSampleSize,
    onChangeHeaderRowHeight,
    onChangeHeaderRowHeightLines,
    onChangeRowHeight,
    onChangeRowHeightLines,
    onUpdateHeaderRowHeight,
    onUpdateRowHeight,
    onUpdateSampleSize,
    rowHeight,
    sampleSizeState,
    onUpdateDataGridDensity,
    lineCountInput,
    headerLineCountInput,
  ]);

  const toolbarVisibility = useMemo(
    () =>
      defaultColumns
        ? {
            ...toolbarVisibilityDefaults,
            showColumnSelector: false,
            showSortSelector: isSortEnabled,
            additionalControls,
            showDisplaySelector,
            showKeyboardShortcuts,
            showFullScreenSelector: showFullScreenButton,
          }
        : {
            ...toolbarVisibilityDefaults,
            showSortSelector: isSortEnabled,
            additionalControls,
            showDisplaySelector,
            showKeyboardShortcuts,
            showFullScreenSelector: showFullScreenButton,
          },
    [
      defaultColumns,
      isSortEnabled,
      additionalControls,
      showDisplaySelector,
      showKeyboardShortcuts,
      showFullScreenButton,
    ]
  );

  const rowHeightsOptions = useRowHeightsOptions({
    rowHeightLines,
    rowLineHeight: rowLineHeightOverride,
  });

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
          data-rendering-count={1} // TODO: Fix this as part of https://github.com/elastic/kibana/issues/179376
          data-title={searchTitle}
          data-description={searchDescription}
          data-document-number={displayedRows.length}
          className={classnames(className, 'unifiedDataTable__table')}
          css={inTableSearchTermCss}
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
              additionalFieldGroups={additionalFieldGroups}
              selectedDocIds={docIdsInSelectionOrder}
              schemaDetectors={schemaDetectors}
              forceShowAllFields={defaultColumns}
              showFullScreenButton={showFullScreenButton}
              fieldFormats={fieldFormats}
              getDocById={getDocById}
              replaceSelectedDocs={replaceSelectedDocs}
              setIsCompareActive={setIsCompareActive}
            />
          ) : (
            <EuiDataGridMemoized
              id={dataGridId}
              aria-describedby={randomId}
              aria-labelledby={ariaLabelledBy}
              columns={euiGridColumns}
              columnVisibility={columnsVisibility}
              data-test-subj="docTable"
              leadingControlColumns={leadingControlColumns}
              onColumnResize={onResize}
              pagination={paginationObj}
              renderCellValue={renderCellValueWithInTableSearchSupport}
              ref={dataGridRef}
              rowCount={rowCount}
              schemaDetectors={schemaDetectors}
              sorting={sorting as EuiDataGridSorting}
              toolbarVisibility={toolbarVisibility}
              rowHeightsOptions={rowHeightsOptions}
              gridStyle={gridStyle}
              renderCustomGridBody={renderCustomGridBody}
              renderCustomToolbar={renderCustomToolbarFn}
              trailingControlColumns={trailingControlColumns}
              cellContext={cellContextWithInTableSearchSupport}
              renderCellPopover={renderCustomPopover}
              // Don't use row overscan when showing Document column since
              // rendering so much DOM content in each cell impacts performance
              virtualizationOptions={defaultColumns ? undefined : VIRTUALIZATION_OPTIONS}
            />
          )}
        </div>
        {loadingState !== DataLoadingState.loading &&
          isPaginationEnabled && // we hide the footer for Surrounding Documents page
          !isFilterActive && // hide footer when showing selected documents
          !isCompareActive && (
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
                  defaultMessage="Table generated by Discover session ''{searchTitle}'' ({searchDescription})"
                  values={{ searchTitle, searchDescription }}
                />
              ) : (
                <FormattedMessage
                  id="unifiedDataTable.searchGenerationWithDescription"
                  defaultMessage="Table generated by Discover session ''{searchTitle}''"
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
