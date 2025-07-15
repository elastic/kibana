/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
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
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
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
import useObservable from 'react-use/lib/useObservable';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import { type AdditionalFieldGroups, useQuerySubscriber } from '@kbn/unified-field-list';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
import { DiscoverGrid } from '../../../../components/discover_grid';
import { getDefaultRowsPerPage } from '../../../../../common/constants';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FetchStatus } from '../../../types';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { useDataState } from '../../hooks/use_data_state';
import {
  getMaxAllowedSampleSize,
  getAllowedSampleSize,
} from '../../../../utils/get_allowed_sample_size';
import { DiscoverGridFlyout } from '../../../../components/discover_grid_flyout';
import { useSavedSearchInitial } from '../../state_management/discover_state_provider';
import { useFetchMoreRecords } from './use_fetch_more_records';
import { SelectedVSAvailableCallout } from './selected_vs_available_callout';
import { useDiscoverCustomization } from '../../../../customizations';
import { onResizeGridColumn } from '../../../../utils/on_resize_grid_column';
import { useContextualGridCustomisations } from '../../hooks/grid_customisations';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import type { CellRenderersExtensionParams } from '../../../../context_awareness';
import {
  DISCOVER_CELL_ACTIONS_TRIGGER,
  useAdditionalCellActions,
  useProfileAccessor,
} from '../../../../context_awareness';
import {
  internalStateActions,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { useScopedServices } from '../../../../components/scoped_services_provider';

const DiscoverGridMemoized = React.memo(DiscoverGrid);

// export needs for testing
export const onResize = (
  colSettings: { columnId: string; width: number | undefined },
  stateContainer: DiscoverStateContainer
) => {
  const state = stateContainer.appState.getState();
  const newGrid = onResizeGridColumn(colSettings, state.grid);
  stateContainer.appState.update({ grid: newGrid });
};

function DiscoverDocumentsComponent({
  viewModeToggle,
  dataView,
  onAddFilter,
  stateContainer,
  onFieldEdited,
  additionalFieldGroups,
}: {
  viewModeToggle: React.ReactElement | undefined;
  dataView: DataView;
  onAddFilter?: DocViewFilterFn;
  stateContainer: DiscoverStateContainer;
  onFieldEdited?: () => void;
  additionalFieldGroups?: AdditionalFieldGroups<DataViewField>;
}) {
  const services = useDiscoverServices();
  const { scopedEBTManager } = useScopedServices();
  const dispatch = useInternalStateDispatch();
  const documents$ = stateContainer.dataState.data$.documents$;
  const savedSearch = useSavedSearchInitial();
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
  const expandedDoc = useInternalStateSelector((state) => state.expandedDoc);
  const initialDocViewerTabId = useInternalStateSelector((state) => state.initialDocViewerTabId);
  const isEsqlMode = useIsEsqlMode();
  const documentState = useDataState(documents$);
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
      stateContainer.appState.update({ ...rest, grid: settings as DiscoverGridSettings });
    },
    [stateContainer]
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
  const setExpandedDoc = useCallback(
    (doc: DataTableRecord | undefined, options?: { initialTabId?: string }) => {
      dispatch(
        internalStateActions.setExpandedDoc({
          expandedDoc: doc,
          initialDocViewerTabId: options?.initialTabId,
        })
      );
      if (options?.initialTabId) {
        docViewerRef.current?.setSelectedTabId(options.initialTabId);
      }
    },
    [dispatch]
  );

  const onResizeDataGrid = useCallback<NonNullable<UnifiedDataTableProps['onResize']>>(
    (colSettings) => onResize(colSettings, stateContainer),
    [stateContainer]
  );

  const onUpdateRowsPerPage = useCallback(
    (nextRowsPerPage: number) => {
      stateContainer.appState.update({ rowsPerPage: nextRowsPerPage });
    },
    [stateContainer]
  );

  const onUpdateSampleSize = useCallback(
    (newSampleSize: number) => {
      stateContainer.appState.update({ sampleSize: newSampleSize });
    },
    [stateContainer]
  );

  const onSort = useCallback(
    (nextSort: string[][]) => {
      stateContainer.appState.update({ sort: nextSort });
    },
    [stateContainer]
  );

  const onUpdateRowHeight = useCallback(
    (newRowHeight: number) => {
      stateContainer.appState.update({ rowHeight: newRowHeight });
    },
    [stateContainer]
  );

  const onUpdateHeaderRowHeight = useCallback(
    (newHeaderRowHeight: number) => {
      stateContainer.appState.update({ headerRowHeight: newHeaderRowHeight });
    },
    [stateContainer]
  );

  const onUpdateDensity = useCallback(
    (newDensity: DataGridDensity) => {
      stateContainer.appState.update({ density: newDensity });
    },
    [stateContainer]
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
  const { filters } = useQuerySubscriber({ data: services.data });

  const cellActionsMetadata = useAdditionalCellActions({
    dataSource,
    dataView,
    query,
    filters,
    timeRange: requestParams.timeRangeAbsolute,
  });

  const renderDocumentView = useCallback(
    (
      hit: DataTableRecord,
      displayedRows: DataTableRecord[],
      displayedColumns: string[],
      customColumnsMeta?: DataTableColumnsMeta
    ) => (
      <DiscoverGridFlyout
        dataView={dataView}
        hit={hit}
        hits={displayedRows}
        // if default columns are used, dont make them part of the URL - the context state handling will take care to restore them
        columns={displayedColumns}
        columnsMeta={customColumnsMeta}
        savedSearchId={savedSearch.id}
        onFilter={onAddFilter}
        onRemoveColumn={onRemoveColumnWithTracking}
        onAddColumn={onAddColumnWithTracking}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDoc}
        query={query}
        initialTabId={initialDocViewerTabId}
        docViewerRef={docViewerRef}
      />
    ),
    [
      dataView,
      savedSearch.id,
      onAddFilter,
      onRemoveColumnWithTracking,
      onAddColumnWithTracking,
      setExpandedDoc,
      query,
      initialDocViewerTabId,
    ]
  );

  const configRowHeight = uiSettings.get(ROW_HEIGHT_OPTION);
  const cellRendererParams: CellRenderersExtensionParams = useMemo(
    () => ({
      actions: { addFilter: onAddFilter },
      dataView,
      density: density ?? getDataGridDensity(services.storage, 'discover'),
      rowHeight: getRowHeight({
        storage: services.storage,
        consumer: 'discover',
        rowHeightState: rowHeight,
        configRowHeight,
      }),
    }),
    [onAddFilter, dataView, density, services.storage, rowHeight, configRowHeight]
  );

  const { rowAdditionalLeadingControls } = useDiscoverCustomization('data_table') || {};
  const { customCellRenderer } = useContextualGridCustomisations(cellRendererParams) || {};

  const getCellRenderersAccessor = useProfileAccessor('getCellRenderers');
  const cellRenderers = useMemo(() => {
    const getCellRenderers = getCellRenderersAccessor(() => customCellRenderer ?? {});
    return getCellRenderers(cellRendererParams);
  }, [cellRendererParams, customCellRenderer, getCellRenderersAccessor]);

  const documents = useObservable(stateContainer.dataState.data$.documents$);

  const callouts = useMemo(
    () => (
      <>
        <SelectedVSAvailableCallout
          esqlQueryColumns={documents?.esqlQueryColumns}
          // If `_source` is in the columns, we should exclude it from the callout
          selectedColumns={currentColumns.filter((col) => col !== '_source')}
        />
        <SearchResponseWarningsCallout warnings={documentState.interceptedWarnings ?? []} />
      </>
    ),
    [currentColumns, documents?.esqlQueryColumns, documentState.interceptedWarnings]
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
    [isDataLoading]
  );

  const renderCustomToolbarWithElements = useMemo(
    () =>
      getRenderCustomToolbarWithElements({
        leftSide: viewModeToggle,
        bottomSection: (
          <>
            {callouts}
            {loadingIndicator}
          </>
        ),
      }),
    [viewModeToggle, callouts, loadingIndicator]
  );

  const dataGridUiState = useCurrentTabSelector((state) => state.uiState.dataGrid);
  const setDataGridUiState = useCurrentTabAction(internalStateActions.setDataGridUiState);
  const onInitialStateChange = useCallback(
    (newDataGridUiState: Partial<UnifiedDataTableRestorableState>) =>
      dispatch(setDataGridUiState({ dataGridUiState: newDataGridUiState })),
    [dispatch, setDataGridUiState]
  );

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
      <div className="unifiedDataTable">
        <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
          <DiscoverGridMemoized
            ariaLabelledBy="documentsAriaLabel"
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
            searchDescription={savedSearch.description}
            searchTitle={savedSearch.title}
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
            additionalFieldGroups={additionalFieldGroups}
            externalCustomRenderers={cellRenderers}
            rowAdditionalLeadingControls={rowAdditionalLeadingControls}
            dataGridDensityState={density}
            onUpdateDataGridDensity={onUpdateDensity}
            onUpdateESQLQuery={stateContainer.actions.updateESQLQuery}
            query={query}
            cellActionsTriggerId={DISCOVER_CELL_ACTIONS_TRIGGER.id}
            cellActionsMetadata={cellActionsMetadata}
            cellActionsHandling="append"
            initialState={dataGridUiState}
            onInitialStateChange={onInitialStateChange}
          />
        </CellActionsProvider>
      </div>
    </EuiFlexItem>
  );
}

export const DiscoverDocuments = memo(DiscoverDocumentsComponent);

const styles = {
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
};
