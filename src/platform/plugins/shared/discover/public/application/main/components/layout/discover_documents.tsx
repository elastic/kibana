/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiProgress,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { SearchResponseWarningsCallout } from '@kbn/search-response-warnings';
import type {
  DataGridDensity,
  UnifiedDataTableProps,
  UnifiedDataTableRestorableState,
  UseColumnsProps,
} from '@kbn/unified-data-table';
import {
  DataLoadingState,
  useColumns,
  type DataTableColumnsMeta,
  getTextBasedColumnsMeta,
  getRenderCustomToolbarWithElements,
  getDataGridDensity,
  getRowHeight,
} from '@kbn/unified-data-table';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  MAX_DOC_FIELDS_DISPLAYED,
  ROW_HEIGHT_OPTION,
  SHOW_MULTIFIELDS,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import type { DocViewerApi, DocViewerRestorableState } from '@kbn/unified-doc-viewer';
import useLatest from 'react-use/lib/useLatest';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { DISCOVER_CELL_ACTIONS_TRIGGER_ID } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { DiscoverGrid } from '../../../../components/discover_grid';
import { getDefaultRowsPerPage } from '../../../../../common/constants';
import {
  selectTabCombinedFilters,
  useAppStateSelector,
  useCurrentTabRuntimeState,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FetchStatus } from '../../../types';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { useDataState } from '../../hooks/use_data_state';
import {
  getMaxAllowedSampleSize,
  getAllowedSampleSize,
} from '../../../../utils/get_allowed_sample_size';
import { useFetchMoreRecords } from './use_fetch_more_records';
import { SelectedVSAvailableCallout } from './selected_vs_available_callout';
import { onResizeGridColumn } from '../../../../utils/on_resize_grid_column';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import type {
  CellRenderersExtensionParams,
  DocViewerExtensionParams,
  OpenInNewTabParams,
  UpdateESQLQueryFn,
} from '../../../../context_awareness';
import { useAdditionalCellActions, useProfileAccessor } from '../../../../context_awareness';
import {
  internalStateActions,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { useScopedServices } from '../../../../components/scoped_services_provider';
import {
  DiscoverGridFlyout,
  type DiscoverGridFlyoutProps,
} from '../../../../components/discover_grid_flyout';
import type { CascadedDocumentsContext } from './cascaded_documents';
import { isCascadedDocumentsVisible } from './cascaded_documents';

// export needs for testing
export const onResize = (
  colSettings: { columnId: string; width: number | undefined },
  currentGrid: DiscoverGridSettings | undefined,
  updateGrid: (grid: DiscoverGridSettings) => void
) => {
  updateGrid(onResizeGridColumn(colSettings, currentGrid));
};

function DiscoverDocumentsComponent({
  viewModeToggle,
  dataView,
  onAddFilter,
  stateContainer,
  onFieldEdited,
}: {
  viewModeToggle: React.ReactElement | undefined;
  dataView: DataView;
  onAddFilter?: DocViewFilterFn;
  stateContainer: DiscoverStateContainer;
  onFieldEdited?: (options: { editedDataView: DataView }) => void;
}) {
  const [isDataGridFullScreen, setIsDataGridFullScreen] = useState(false);
  const styles = useMemoCss(componentStyles);
  const services = useDiscoverServices();
  const { scopedEBTManager } = useScopedServices();
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );
  const { dataViews, capabilities, uiSettings, uiActions, fieldsMetadata } = services;
  const requestParams = useCurrentTabSelector((state) => state.dataRequestParams);
  const [
    dataSource,
    query,
    sort,
    rowHeight,
    headerRowHeight,
    rowsPerPage,
    grid,
    columns,
    sampleSizeState,
    density,
  ] = useAppStateSelector((state) => {
    return [
      state.dataSource,
      state.query,
      state.sort,
      state.rowHeight,
      state.headerRowHeight,
      state.rowsPerPage,
      state.grid,
      state.columns,
      state.sampleSize,
      state.density,
    ];
  });
  const expandedDoc = useCurrentTabSelector((state) => state.expandedDoc);
  const initialDocViewerTabId = useCurrentTabSelector((state) => state.initialDocViewerTabId);
  const isEsqlMode = useIsEsqlMode();
  const documentState = useDataState(stateContainer.dataState.data$.documents$);
  const isDataLoading =
    documentState.fetchStatus === FetchStatus.LOADING ||
    documentState.fetchStatus === FetchStatus.PARTIAL;

  // This is needed to prevent EuiDataGrid pushing onSort because the data view has been switched.
  // It's just necessary for non ES|QL requests since they don't have a partial result state, that's
  // considered as loading state in the Component.
  // 1. When switching the data view, the sorting in the URL is reset to the default sorting of the selected data view.
  // 2. The new sort param is already available in this component and propagated to the EuiDataGrid.
  // 3. currentColumns are still referring to the old state
  // 4. since the new sort by field isn't available in currentColumns EuiDataGrid is emitting a 'onSort', which is unsorting the grid
  // 5. this is propagated to Discover's URL and causes an unwanted change of state to an unsorted state
  // This solution switches to the loading state in this component when the URL index doesn't match the dataView.id
  const isDataViewLoading =
    useCurrentTabSelector((state) => state.isDataViewLoading) && !isEsqlMode;
  const isEmptyDataResult =
    isEsqlMode || !documentState.result || documentState.result.length === 0;
  const rows = useMemo(() => documentState.result || [], [documentState.result]);

  const { isMoreDataLoading, totalHits, onFetchMoreRecords } = useFetchMoreRecords({
    stateContainer,
  });

  const setAppState = useCallback<UseColumnsProps['setAppState']>(
    ({ settings, ...rest }) => {
      dispatch(updateAppState({ appState: { ...rest, grid: settings as DiscoverGridSettings } }));
    },
    [dispatch, updateAppState]
  );

  const {
    columns: currentColumns,
    onAddColumn,
    onRemoveColumn,
    onSetColumns,
  } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    setAppState,
    columns,
    sort,
    settings: grid,
  });

  const onAddColumnWithTracking = useCallback(
    (columnName: string) => {
      onAddColumn(columnName);
      void scopedEBTManager.trackDataTableSelection({ fieldName: columnName, fieldsMetadata });
    },
    [onAddColumn, scopedEBTManager, fieldsMetadata]
  );

  const onRemoveColumnWithTracking = useCallback(
    (columnName: string) => {
      onRemoveColumn(columnName);
      void scopedEBTManager.trackDataTableRemoval({ fieldName: columnName, fieldsMetadata });
    },
    [onRemoveColumn, scopedEBTManager, fieldsMetadata]
  );

  const docViewerRef = useRef<DocViewerApi>(null);
  const setExpandedDocAction = useCurrentTabAction(internalStateActions.setExpandedDoc);
  const setExpandedDoc = useCallback(
    (
      doc: DataTableRecord | undefined,
      options?: {
        initialTabId?: string;
        initialTabState?: object;
      }
    ) => {
      dispatch(
        setExpandedDocAction({
          expandedDoc: doc,
          initialDocViewerTabId: options?.initialTabId,
          initialDocViewerTabState: options?.initialTabState,
        })
      );
      if (options?.initialTabId) {
        docViewerRef.current?.setSelectedTabId(options.initialTabId);
      }
    },
    [dispatch, setExpandedDocAction]
  );

  const latestGrid = useLatest(grid);
  const onResizeDataGrid = useCallback<NonNullable<UnifiedDataTableProps['onResize']>>(
    (colSettings) => {
      onResize(colSettings, latestGrid.current, (nextGrid) => {
        dispatch(updateAppState({ appState: { grid: nextGrid } }));
      });
    },
    [dispatch, latestGrid, updateAppState]
  );

  const onUpdateRowsPerPage = useCallback(
    (nextRowsPerPage: number) => {
      dispatch(updateAppState({ appState: { rowsPerPage: nextRowsPerPage } }));
    },
    [dispatch, updateAppState]
  );

  const onUpdateSampleSize = useCallback(
    (newSampleSize: number) => {
      dispatch(updateAppState({ appState: { sampleSize: newSampleSize } }));
    },
    [dispatch, updateAppState]
  );

  const onSort = useCallback(
    (nextSort: string[][]) => {
      dispatch(updateAppState({ appState: { sort: nextSort } }));
    },
    [dispatch, updateAppState]
  );

  const onUpdateRowHeight = useCallback(
    (newRowHeight: number) => {
      dispatch(updateAppState({ appState: { rowHeight: newRowHeight } }));
    },
    [dispatch, updateAppState]
  );

  const onUpdateHeaderRowHeight = useCallback(
    (newHeaderRowHeight: number) => {
      dispatch(updateAppState({ appState: { headerRowHeight: newHeaderRowHeight } }));
    },
    [dispatch, updateAppState]
  );

  const onUpdateDensity = useCallback(
    (newDensity: DataGridDensity) => {
      dispatch(updateAppState({ appState: { density: newDensity } }));
    },
    [dispatch, updateAppState]
  );

  // should be aligned with embeddable `showTimeCol` prop
  const showTimeCol = useMemo(
    () => !uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
    [uiSettings]
  );

  const columnsMeta: DataTableColumnsMeta | undefined = useMemo(
    () =>
      documentState.esqlQueryColumns
        ? getTextBasedColumnsMeta(documentState.esqlQueryColumns)
        : undefined,
    [documentState.esqlQueryColumns]
  );
  const filters = useCurrentTabSelector(selectTabCombinedFilters);

  const extensionActions = useMemo(
    () => ({
      openInNewTab: (params: OpenInNewTabParams) => {
        dispatch(internalStateActions.openInNewTabExtPointAction(params));
      },
    }),
    [dispatch]
  );

  const cellActionsMetadata = useAdditionalCellActions({
    dataSource,
    dataView,
    query,
    filters,
    timeRange: requestParams.timeRangeAbsolute,
    extensionActions,
  });

  const updateESQLQuery = useCurrentTabAction(internalStateActions.updateESQLQuery);
  const onUpdateESQLQuery: UpdateESQLQueryFn = useCallback(
    (queryOrUpdater) => {
      dispatch(updateESQLQuery({ queryOrUpdater }));
    },
    [dispatch, updateESQLQuery]
  );

  const docViewerExtensionActions = useMemo<DocViewerExtensionParams['actions']>(
    () => ({
      openInNewTab: (params) => dispatch(internalStateActions.openInNewTabExtPointAction(params)),
      updateESQLQuery: onUpdateESQLQuery,
    }),
    [dispatch, onUpdateESQLQuery]
  );

  const docViewerUiState = useCurrentTabSelector((state) => state.uiState.docViewer);
  const setDocViewerUiState = useCurrentTabAction(internalStateActions.setDocViewerUiState);

  const onInitialDocViewerStateChange = useCallback(
    (newDocViewerUiState: Partial<DocViewerRestorableState>) => {
      dispatch(setDocViewerUiState({ docViewerUiState: newDocViewerUiState }));
    },
    [dispatch, setDocViewerUiState]
  );

  const setInitialDocViewerTabIdAction = useCurrentTabAction(
    internalStateActions.setInitialDocViewerTabId
  );

  const onUpdateSelectedTabId = useCallback(
    (tabId: string | undefined) => {
      dispatch(setInitialDocViewerTabIdAction({ initialDocViewerTabId: tabId }));
    },
    [dispatch, setInitialDocViewerTabIdAction]
  );

  const renderDocumentView = useCallback(
    (
      hit: DataTableRecord,
      displayedRows: DataTableRecord[],
      displayedColumns: string[],
      expandedDocSetter: DiscoverGridFlyoutProps['setExpandedDoc'],
      customColumnsMeta?: DataTableColumnsMeta
    ) => (
      <DiscoverGridFlyout
        dataView={dataView}
        hit={hit}
        hits={displayedRows}
        // if default columns are used, don't make them part of the URL - the context state handling will take care to restore them
        columns={displayedColumns}
        columnsMeta={customColumnsMeta}
        savedSearchId={persistedDiscoverSession?.id!}
        query={query}
        initialTabId={initialDocViewerTabId}
        onFilter={onAddFilter}
        onRemoveColumn={onRemoveColumnWithTracking}
        onAddColumn={onAddColumnWithTracking}
        setExpandedDoc={expandedDocSetter}
        onClose={expandedDocSetter.bind(null, undefined)}
        docViewerRef={docViewerRef}
        docViewerExtensionActions={docViewerExtensionActions}
        onUpdateSelectedTabId={onUpdateSelectedTabId}
        initialDocViewerState={docViewerUiState}
        onInitialDocViewerStateChange={onInitialDocViewerStateChange}
      />
    ),
    [
      dataView,
      persistedDiscoverSession?.id,
      query,
      initialDocViewerTabId,
      onAddFilter,
      onRemoveColumnWithTracking,
      onAddColumnWithTracking,
      docViewerExtensionActions,
      onUpdateSelectedTabId,
      docViewerUiState,
      onInitialDocViewerStateChange,
    ]
  );

  const dataGridUiState = useCurrentTabSelector((state) => state.uiState.dataGrid);
  const setDataGridUiState = useCurrentTabAction(internalStateActions.setDataGridUiState);
  const onInitialStateChange = useCallback(
    (newDataGridUiState: Partial<UnifiedDataTableRestorableState>) => {
      dispatch(setDataGridUiState({ dataGridUiState: newDataGridUiState }));
    },
    [dispatch, setDataGridUiState]
  );

  const configRowHeight = uiSettings.get(ROW_HEIGHT_OPTION);
  const cellRendererDensity = useMemo(
    () => density ?? dataGridUiState?.density ?? getDataGridDensity(services.storage, 'discover'),
    [density, dataGridUiState, services.storage]
  );
  const cellRendererRowHeight = useMemo(
    () =>
      getRowHeight({
        storage: services.storage,
        consumer: 'discover',
        rowHeightState: rowHeight ?? dataGridUiState?.rowHeight,
        configRowHeight,
      }),
    [rowHeight, dataGridUiState, services.storage, configRowHeight]
  );
  const cellRendererParams: CellRenderersExtensionParams = useMemo(
    () => ({
      actions: { addFilter: onAddFilter },
      dataView,
      density: cellRendererDensity,
      rowHeight: cellRendererRowHeight,
    }),
    [onAddFilter, dataView, cellRendererDensity, cellRendererRowHeight]
  );

  const getCellRenderersAccessor = useProfileAccessor('getCellRenderers');
  const cellRenderers = useMemo(() => {
    const getCellRenderers = getCellRenderersAccessor(() => ({}));
    return getCellRenderers(cellRendererParams);
  }, [cellRendererParams, getCellRenderersAccessor]);

  const callouts = useMemo(
    () => (
      <>
        <SelectedVSAvailableCallout
          esqlQueryColumns={documentState.esqlQueryColumns}
          // If `_source` is in the columns, we should exclude it from the callout
          selectedColumns={currentColumns.filter((col) => col !== '_source')}
        />
        <SearchResponseWarningsCallout warnings={documentState.interceptedWarnings ?? []} />
      </>
    ),
    [currentColumns, documentState.esqlQueryColumns, documentState.interceptedWarnings]
  );

  const loadingIndicator = useMemo(
    () =>
      isDataLoading ? (
        <EuiProgress
          data-test-subj="discoverDataGridUpdating"
          size="xs"
          color="accent"
          position="absolute"
          css={styles.progress}
        />
      ) : null,
    [isDataLoading, styles.progress]
  );

  const renderCustomToolbarWithElements = useMemo(
    () =>
      getRenderCustomToolbarWithElements({
        leftSide: isDataGridFullScreen ? undefined : viewModeToggle,
        bottomSection: (
          <>
            {callouts}
            {loadingIndicator}
          </>
        ),
      }),
    [viewModeToggle, callouts, loadingIndicator, isDataGridFullScreen]
  );

  const cascadedDocumentsFetcher = useCurrentTabRuntimeState(
    stateContainer.runtimeStateManager,
    (runtimeState) => runtimeState.cascadedDocumentsFetcher$
  );
  const { availableCascadeGroups, selectedCascadeGroups } = useCurrentTabSelector(
    (tab) => tab.cascadedDocumentsState
  );
  const setSelectedCascadeGroups = useCurrentTabAction(
    internalStateActions.setSelectedCascadeGroups
  );
  const esqlVariables = useCurrentTabSelector((tab) => tab.esqlVariables);
  const cascadedDocumentsContext = useMemo<CascadedDocumentsContext | undefined>(() => {
    if (
      !isCascadedDocumentsVisible(availableCascadeGroups, query) ||
      !isOfAggregateQueryType(query)
    ) {
      return undefined;
    }

    return {
      cascadedDocumentsFetcher,
      availableCascadeGroups,
      selectedCascadeGroups,
      esqlQuery: query,
      esqlVariables,
      timeRange: requestParams.timeRangeAbsolute,
      viewModeToggle,
      cascadeGroupingChangeHandler: (newSelectedCascadeGroups) => {
        dispatch(setSelectedCascadeGroups({ selectedCascadeGroups: newSelectedCascadeGroups }));
      },
      onUpdateESQLQuery,
      openInNewTab: (params) => dispatch(internalStateActions.openInNewTab(params)),
    };
  }, [
    availableCascadeGroups,
    cascadedDocumentsFetcher,
    dispatch,
    esqlVariables,
    onUpdateESQLQuery,
    query,
    requestParams.timeRangeAbsolute,
    selectedCascadeGroups,
    setSelectedCascadeGroups,
    viewModeToggle,
  ]);

  if (isDataViewLoading || (isEmptyDataResult && isDataLoading)) {
    return (
      // class is used in tests
      <div className="dscDocuments__loading" css={styles.dscDocumentsLoading}>
        <EuiText size="xs" color="subdued">
          <EuiLoadingSpinner />
          <EuiSpacer size="s" />
          <FormattedMessage id="discover.loadingDocuments" defaultMessage="Loading documents" />
        </EuiText>
      </div>
    );
  }

  return (
    // class is used in tests
    <EuiFlexItem className="dscTable" aria-labelledby="documentsAriaLabel" css={styles.container}>
      <EuiScreenReaderOnly>
        <h2 id="documentsAriaLabel">
          <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
        </h2>
      </EuiScreenReaderOnly>
      <div className="unifiedDataTable" css={styles.dataTable}>
        <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
          <DiscoverGrid
            ariaLabelledBy="documentsAriaLabel"
            cascadedDocumentsContext={cascadedDocumentsContext}
            columns={currentColumns}
            columnsMeta={columnsMeta}
            expandedDoc={expandedDoc}
            dataView={dataView}
            loadingState={
              isDataLoading
                ? DataLoadingState.loading
                : isMoreDataLoading
                ? DataLoadingState.loadingMore
                : DataLoadingState.loaded
            }
            rows={rows}
            sort={(sort as SortOrder[]) || []}
            searchDescription={persistedDiscoverSession?.description}
            searchTitle={persistedDiscoverSession?.title} // TODO: should it be rather a tab label?
            setExpandedDoc={setExpandedDoc}
            showTimeCol={showTimeCol}
            settings={grid}
            onFilter={onAddFilter as DocViewFilterFn}
            onSetColumns={onSetColumns}
            onSort={onSort}
            onResize={onResizeDataGrid}
            configHeaderRowHeight={3}
            headerRowHeightState={headerRowHeight}
            onUpdateHeaderRowHeight={onUpdateHeaderRowHeight}
            rowHeightState={rowHeight}
            onUpdateRowHeight={onUpdateRowHeight}
            isSortEnabled={true}
            isPlainRecord={isEsqlMode}
            isPaginationEnabled={!isEsqlMode}
            rowsPerPageState={rowsPerPage ?? getDefaultRowsPerPage(services.uiSettings)}
            onUpdateRowsPerPage={onUpdateRowsPerPage}
            maxAllowedSampleSize={getMaxAllowedSampleSize(services.uiSettings)}
            sampleSizeState={getAllowedSampleSize(sampleSizeState, services.uiSettings)}
            onUpdateSampleSize={!isEsqlMode ? onUpdateSampleSize : undefined}
            onFieldEdited={onFieldEdited}
            configRowHeight={configRowHeight}
            showMultiFields={uiSettings.get(SHOW_MULTIFIELDS)}
            maxDocFieldsDisplayed={uiSettings.get(MAX_DOC_FIELDS_DISPLAYED)}
            renderDocumentView={renderDocumentView}
            renderCustomToolbar={renderCustomToolbarWithElements}
            services={services}
            totalHits={totalHits}
            onFetchMoreRecords={onFetchMoreRecords}
            externalCustomRenderers={cellRenderers}
            dataGridDensityState={density}
            onUpdateDataGridDensity={onUpdateDensity}
            onUpdateESQLQuery={onUpdateESQLQuery}
            query={query}
            cellActionsTriggerId={DISCOVER_CELL_ACTIONS_TRIGGER_ID}
            cellActionsMetadata={cellActionsMetadata}
            cellActionsHandling="append"
            initialState={dataGridUiState}
            onInitialStateChange={onInitialStateChange}
            onFullScreenChange={setIsDataGridFullScreen}
          />
        </CellActionsProvider>
      </div>
    </EuiFlexItem>
  );
}

export const DiscoverDocuments = memo(DiscoverDocumentsComponent);

const componentStyles = {
  container: css({
    position: 'relative',
    minHeight: 0,
  }),
  progress: css({
    zIndex: 2,
  }),
  dscDocumentsLoading: css({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
    width: '100%',
  }),
  dataTable: css({
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    overflow: 'hidden',
  }),
};
