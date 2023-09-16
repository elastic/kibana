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
  EuiDataGridCellValueElementProps,
  EuiDataGridCustomToolbarProps,
  EuiDataGridToolBarVisibilityOptions,
  EuiDataGridToolBarVisibilityDisplaySelectorOptions,
  EuiDataGridStyle,
  EuiDataGridProps,
  EuiDataGridColumn,
  useGeneratedHtmlId,
  useEuiBackgroundColor,
  EuiDataGridColumnVisibility,
  EuiDataGridRowHeightsOptions,
  EuiButtonEmpty,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroupItemProps,
  tint,
  EuiButtonIcon,
  EuiPopover,
  EuiToolTip,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  useDataGridColumnsCellActions,
  type UseDataGridColumnsCellActionsProps,
} from '@kbn/cell-actions';
import type { ToastsStart, IUiSettingsClient } from '@kbn/core/public';
import type { Serializable } from '@kbn/utility-types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { getShouldShowFieldHandler, formatFieldValue } from '@kbn/discover-utils';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { isEqual } from 'lodash';
import classNames from 'classnames';
import { FieldIcon } from '@kbn/react-field';
import { diffChars, diffLines, diffWords } from 'diff';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { getFieldTypeName } from '@kbn/field-utils';
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
import { CELL_CLASS, getRenderCellValueFn } from '../utils/get_render_cell_value';
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
  const [showDiff, setShowDiff] = useLocalStorage(`${consumer}:dataGridShowDiff`, true);
  const [showAllFields, setShowAllFields] = useLocalStorage(
    `${consumer}:dataGridShowAllFields`,
    false
  );
  const [isDiffOptionsMenuOpen, setIsDiffOptionsMenuOpen] = useState(false);
  const [diffMode, setDiffMode] = useLocalStorage<'basic' | 'chars' | 'words' | 'lines'>(
    `${consumer}:dataGridDiffMode`,
    'basic'
  );
  const [showDiffDecorations, setShowDiffDecorations] = useLocalStorage(
    `${consumer}:dataGridShowDiffDecorations`,
    true
  );
  const displayedColumns = getDisplayedColumns(columns, dataView);
  const defaultColumns = displayedColumns.includes('_source');
  const rowMap = useMemo(() => {
    const map = new Map<string, DataTableRecord>();
    rows?.forEach((row) => {
      map.set(row.id, row);
    });
    return map;
  }, [rows]);
  const usedSelectedDocs = useMemo(() => {
    if (!selectedDocs.length || !rows?.length) {
      return [];
    }
    // filter out selected docs that are no longer part of the current data
    const result = selectedDocs.filter((docId) => !!rowMap.get(docId));
    if (result.length === 0 && isFilterActive) {
      setIsFilterActive(false);
    }
    return result;
  }, [selectedDocs, rows?.length, isFilterActive, rowMap]);

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
            isCompareActive={isCompareActive}
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
  }, [usedSelectedDocs, isFilterActive, isCompareActive, rows, externalAdditionalControls]);

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

  const { dataGridId, setDataGridWrapper } = useFullScreenWatcher();

  const comparisonFields = useMemo(() => {
    if (!isCompareActive) {
      return [];
    }

    let fields: string[] = [];

    if (defaultColumns || showAllFields) {
      if (dataView.timeFieldName) {
        fields.push(dataView.timeFieldName);
      }

      dataView.fields
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .forEach((field) => {
          if (field.name !== dataView.timeFieldName) {
            fields.push(field.name);
          }
        });
    } else {
      fields = visibleColumns;
    }

    return fields;
  }, [
    dataView.fields,
    dataView.timeFieldName,
    defaultColumns,
    isCompareActive,
    showAllFields,
    visibleColumns,
  ]);

  const comparisonRowCount = useMemo(() => {
    if (!isCompareActive) {
      return 0;
    }

    return comparisonFields.length;
  }, [comparisonFields.length, isCompareActive]);

  const fieldsColumnId = useGeneratedHtmlId({ prefix: 'fields' });

  const comparisonColumns: EuiDataGridColumn[] = useMemo(() => {
    if (!isCompareActive) {
      return [];
    }

    const fieldsColumnName = 'Field';
    const fieldsColumn: EuiDataGridColumn = {
      id: fieldsColumnId,
      displayAsText: fieldsColumnName,
      isSortable: true,
      actions: false,
      initialWidth: 200,
      isExpandable: false,
    };
    const currentColumns = [fieldsColumn];

    usedSelectedDocs.forEach((docId, i) => {
      const doc = rowMap.get(docId);

      if (doc) {
        const additional: EuiListGroupItemProps[] = [];

        if (i !== 0) {
          additional.push({
            iconType: 'pin',
            label: 'Pin for comparison',
            size: 'xs',
            onClick: () => {
              const newSelectedDocs = [...selectedDocs];
              const index = newSelectedDocs.indexOf(docId);
              const [baseDocId] = newSelectedDocs;

              newSelectedDocs[0] = docId;
              newSelectedDocs[index] = baseDocId;

              setSelectedDocs(newSelectedDocs);
            },
          });
        }

        if (selectedDocs.length > 2) {
          additional.push({
            iconType: 'cross',
            label: 'Remove from comparison',
            size: 'xs',
            onClick: () => {
              const newSelectedDocs = [...selectedDocs];
              newSelectedDocs.splice(i, 1);

              setSelectedDocs(newSelectedDocs);
            },
          });
        }

        currentColumns.push({
          id: docId,
          displayAsText: doc.raw._id,
          isSortable: true,
          actions: {
            showHide: false,
            showMoveLeft: false,
            showMoveRight: false,
            showSortAsc: false,
            showSortDesc: false,
            additional,
          },
        });
      }
    });

    return currentColumns;
  }, [fieldsColumnId, isCompareActive, rowMap, selectedDocs, usedSelectedDocs]);

  const comparisonToolbarVisibility: EuiDataGridToolBarVisibilityOptions = useMemo(
    () => ({
      showColumnSelector: false,
      showDisplaySelector: {
        allowDensity: false,
      },
      additionalControls: (
        <>
          <EuiButtonEmpty
            size="xs"
            color="text"
            iconType="cross"
            onClick={() => {
              setIsCompareActive(false);
            }}
            data-test-subj="unifiedFieldListCloseComparison"
            className={classNames({
              // eslint-disable-next-line @typescript-eslint/naming-convention
              euiDataGrid__controlBtn: true,
            })}
          >
            <FormattedMessage
              id="unifiedDataTable.closeDocumentComparison"
              defaultMessage="Stop comparing documents"
            />
          </EuiButtonEmpty>
          <EuiSwitch
            label="Show diff"
            checked={showDiff ?? true}
            labelProps={{
              css: css`
                font-size: ${euiThemeVars.euiFontSizeXS} !important;
                font-weight: ${euiThemeVars.euiFontWeightMedium};
              `,
            }}
            compressed
            css={css`
              padding-left: ${euiThemeVars.euiSizeXS};
            `}
            onChange={(e) => {
              setShowDiff(e.target.checked);
            }}
          />
          <EuiPopover
            button={
              <EuiToolTip position="top" delay="long" content="Diff options">
                <EuiButtonIcon
                  iconType="arrowDown"
                  size="xs"
                  iconSize="s"
                  color="text"
                  disabled={!showDiff}
                  aria-label="Diff options"
                  onClick={() => {
                    setIsDiffOptionsMenuOpen(!isDiffOptionsMenuOpen);
                  }}
                />
              </EuiToolTip>
            }
            isOpen={isDiffOptionsMenuOpen}
            closePopover={() => {
              setIsDiffOptionsMenuOpen(false);
            }}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel size="s">
              <EuiPanel
                color="transparent"
                paddingSize="s"
                css={css`
                  padding-bottom: 0;
                `}
              >
                <EuiTitle size="xxs">
                  <h3>Diff mode</h3>
                </EuiTitle>
              </EuiPanel>

              <EuiContextMenuItem
                key="basic"
                icon={diffMode === 'basic' ? 'check' : 'empty'}
                size="s"
                onClick={() => {
                  setDiffMode('basic');
                }}
              >
                Full value
              </EuiContextMenuItem>

              <EuiHorizontalRule margin="none" />

              <EuiPanel
                color="transparent"
                paddingSize="s"
                css={css`
                  padding-bottom: 0;
                `}
              >
                <EuiTitle size="xxxs">
                  <h4>
                    Advanced modes{' '}
                    <EuiToolTip
                      position="top"
                      content={
                        'Advanced modes offer enhanced diffing capabilities, but operate ' +
                        'on raw documents and therefore do not support field formatting.'
                      }
                    >
                      <EuiIcon type="questionInCircle" />
                    </EuiToolTip>
                  </h4>
                </EuiTitle>
              </EuiPanel>

              <EuiContextMenuItem
                key="chars"
                icon={diffMode === 'chars' ? 'check' : 'empty'}
                size="s"
                onClick={() => {
                  setDiffMode('chars');
                }}
              >
                By character
              </EuiContextMenuItem>

              <EuiContextMenuItem
                key="words"
                icon={diffMode === 'words' ? 'check' : 'empty'}
                size="s"
                onClick={() => {
                  setDiffMode('words');
                }}
              >
                By word
              </EuiContextMenuItem>

              <EuiContextMenuItem
                key="lines"
                icon={diffMode === 'lines' ? 'check' : 'empty'}
                size="s"
                onClick={() => {
                  setDiffMode('lines');
                }}
              >
                By line
              </EuiContextMenuItem>

              <EuiHorizontalRule margin="none" />

              <EuiPanel
                color="transparent"
                paddingSize="s"
                css={css`
                  padding-bottom: 0;
                `}
              >
                <EuiTitle size="xxs">
                  <h3>Settings</h3>
                </EuiTitle>
              </EuiPanel>

              <EuiPanel color="transparent" paddingSize="s">
                <EuiSwitch
                  label="Show decorations"
                  checked={showDiffDecorations ?? true}
                  compressed
                  onChange={(e) => {
                    setShowDiffDecorations(e.target.checked);
                  }}
                />
              </EuiPanel>
            </EuiContextMenuPanel>
          </EuiPopover>
          {!defaultColumns && (
            <EuiSwitch
              label="Show all fields"
              checked={showAllFields ?? false}
              labelProps={{
                css: css`
                  font-size: ${euiThemeVars.euiFontSizeXS} !important;
                  font-weight: ${euiThemeVars.euiFontWeightMedium};
                `,
              }}
              compressed
              css={css`
                padding-left: ${euiThemeVars.euiSizeM};
              `}
              onChange={(e) => {
                setShowAllFields(e.target.checked);
              }}
            />
          )}
        </>
      ),
    }),
    [
      defaultColumns,
      diffMode,
      isDiffOptionsMenuOpen,
      setDiffMode,
      setShowAllFields,
      setShowDiff,
      setShowDiffDecorations,
      showAllFields,
      showDiff,
      showDiffDecorations,
    ]
  );

  const comparisonInMemory: EuiDataGridInMemory = useMemo(() => ({ level: 'sorting' }), []);
  const comparisonColumnVisibility: EuiDataGridColumnVisibility = useMemo(
    () => ({
      visibleColumns: comparisonColumns.map(({ id }) => id),
      setVisibleColumns: () => {},
    }),
    [comparisonColumns]
  );
  const comparisonRowHeight: EuiDataGridRowHeightsOptions = useMemo(
    () => ({ defaultHeight: 'auto' }),
    []
  );

  const comparisonBaseDocId = usedSelectedDocs[0];
  const comparisonBaseDoc = useMemo(
    () => rowMap.get(comparisonBaseDocId)?.flattened,
    [comparisonBaseDocId, rowMap]
  );
  const matchBackgroundColor = useEuiBackgroundColor('success');
  const diffBackgroundColor = useEuiBackgroundColor('danger');
  const baseDocCellCss = css`
    background-color: ${useEuiBackgroundColor('success', { method: 'transparent' })};
  `;
  const matchingCellCss = css`
    .unifiedDataTable__cellValue {
      &,
      & * {
        color: ${euiThemeVars.euiColorSuccessText} !important;
      }
    }
  `;
  const differentCellCss = css`
    .unifiedDataTable__cellValue {
      &,
      & * {
        color: ${euiThemeVars.euiColorDangerText} !important;
      }
    }
  `;

  const renderComparisonCellValue = useCallback(
    function ComparisonCellValue(props: EuiDataGridCellValueElementProps) {
      const { rowIndex, columnId, setCellProps } = props;
      const fieldName = comparisonFields[rowIndex];
      const field = useMemo(() => dataView.fields.getByName(fieldName), [fieldName]);
      const doc = useMemo(() => rowMap.get(columnId), [columnId]);

      useEffect(() => {
        if (!showDiff || diffMode !== 'basic') {
          setCellProps({ css: undefined });
          return;
        }

        if (columnId === comparisonBaseDocId) {
          setCellProps({ css: baseDocCellCss });
        } else if (columnId !== fieldsColumnId) {
          const baseValue = comparisonBaseDoc?.[fieldName];
          const currentValue = doc?.flattened[fieldName];

          if (isEqual(baseValue, currentValue)) {
            setCellProps({ css: matchingCellCss });
          } else {
            setCellProps({ css: differentCellCss });
          }
        }
      }, [columnId, doc?.flattened, fieldName, setCellProps]);

      if (columnId === fieldsColumnId) {
        return (
          <EuiFlexGroup responsive={false} gutterSize="s">
            <EuiFlexItem grow={false}>
              <FieldIcon
                type={field?.type ?? 'unknown'}
                label={getFieldTypeName(field?.type)}
                scripted={field?.scripted}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText
                size="relative"
                css={css`
                  font-weight: ${euiThemeVars.euiFontWeightSemiBold};
                `}
              >
                {field?.displayName ?? fieldName}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      if (!doc) {
        return '-';
      }

      const baseValue = comparisonBaseDoc?.[fieldName];
      const currentValue = doc?.flattened[fieldName];

      if (showDiff && diffMode !== 'basic' && baseValue && currentValue) {
        const hasLengthOne = (value: unknown): value is unknown[] => {
          return Array.isArray(value) && value.length === 1;
        };
        const getStringifiedValue = (value: unknown, forceJson: boolean) => {
          const extractedValue = !forceJson && hasLengthOne(value) ? value[0] : value;
          if (forceJson || typeof extractedValue === 'object') {
            return JSON.stringify(extractedValue, null, 2);
          }
          return String(extractedValue ?? '-');
        };
        const forceJson =
          (hasLengthOne(baseValue) && !hasLengthOne(currentValue)) ||
          (!hasLengthOne(baseValue) && hasLengthOne(currentValue));
        const baseValueString = getStringifiedValue(baseValue, forceJson);
        const currentValueString = getStringifiedValue(currentValue, forceJson);
        const diff =
          diffMode === 'chars'
            ? diffChars(baseValueString, currentValueString)
            : diffMode === 'words'
            ? diffWords(baseValueString, currentValueString)
            : diffLines(baseValueString, currentValueString);
        const indicatorCss = css`
          position: absolute;
          width: ${euiThemeVars.euiSizeS};
          height: 100%;
          margin-left: calc(-${euiThemeVars.euiSizeS} - calc(${euiThemeVars.euiSizeXS} / 2));
          text-align: center;
          line-height: ${euiThemeVars.euiFontSizeM};
          font-weight: ${euiThemeVars.euiFontWeightMedium};
        `;
        const matchCss = css`
          background-color: ${matchBackgroundColor};
          color: ${euiThemeVars.euiColorSuccessText};
        `;
        const matchIndicatorCss = css`
          &:before {
            content: '+';
            ${indicatorCss}
            background-color: ${euiThemeVars.euiColorSuccess};
            color: ${euiThemeVars.euiColorLightestShade};
          }
        `;
        const diffCss = css`
          background-color: ${diffBackgroundColor};
          color: ${euiThemeVars.euiColorDangerText};
        `;
        const diffIndicatorCss = css`
          &:before {
            content: '-';
            ${indicatorCss}
            background-color: ${tint(euiThemeVars.euiColorDanger, 0.25)};
            color: ${euiThemeVars.euiColorLightestShade};
          }
        `;
        const SegmentTag: keyof JSX.IntrinsicElements = diffMode === 'lines' ? 'div' : 'span';

        return (
          <div className={CELL_CLASS}>
            {diff.map((part) => (
              <SegmentTag
                css={[
                  css`
                    position: relative;
                  `,
                  part.added ? matchCss : part.removed ? diffCss : undefined,
                  diffMode === 'lines'
                    ? css`
                        padding-left: calc(${euiThemeVars.euiSizeXS} / 2);
                      `
                    : undefined,
                  showDiffDecorations
                    ? diffMode === 'lines'
                      ? part.added
                        ? matchIndicatorCss
                        : part.removed
                        ? diffIndicatorCss
                        : undefined
                      : part.added
                      ? css`
                          text-decoration: underline;
                        `
                      : part.removed
                      ? css`
                          text-decoration: line-through;
                        `
                      : undefined
                    : undefined,
                ]}
              >
                {part.value}
              </SegmentTag>
            ))}
          </div>
        );
      }

      return (
        <span
          className={CELL_CLASS}
          // formatFieldValue guarantees sanitized values
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: formatFieldValue(
              doc.flattened[fieldName],
              doc.raw,
              fieldFormats,
              dataView,
              dataView.getFieldByName(fieldName)
            ),
          }}
        />
      );
    },
    [
      baseDocCellCss,
      comparisonBaseDoc,
      comparisonBaseDocId,
      comparisonFields,
      dataView,
      diffBackgroundColor,
      diffMode,
      differentCellCss,
      fieldFormats,
      fieldsColumnId,
      matchBackgroundColor,
      matchingCellCss,
      rowMap,
      showDiff,
      showDiffDecorations,
    ]
  );

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
          data-test-subj="discoverDocTable"
          data-render-complete={isRenderComplete}
          data-shared-item=""
          data-title={searchTitle}
          data-description={searchDescription}
          data-document-number={displayedRows.length}
          className={classnames(className, 'unifiedDataTable__table')}
        >
          {isCompareActive ? (
            <EuiDataGridMemoized
              id={dataGridId}
              key="comparisonTable"
              aria-describedby={randomId}
              aria-labelledby={ariaLabelledBy}
              columns={comparisonColumns}
              columnVisibility={comparisonColumnVisibility}
              data-test-subj="comparisonTable"
              renderCellValue={renderComparisonCellValue}
              rowCount={comparisonRowCount}
              schemaDetectors={schemaDetectors}
              toolbarVisibility={comparisonToolbarVisibility}
              inMemory={comparisonInMemory}
              gridStyle={GRID_STYLE}
              rowHeightsOptions={comparisonRowHeight}
            />
          ) : (
            <EuiDataGridMemoized
              id={dataGridId}
              key="docTable"
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
          isPaginationEnabled && ( // we hide the footer for Surrounding Documents page
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
