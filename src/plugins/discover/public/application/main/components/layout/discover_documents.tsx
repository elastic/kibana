/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, useCallback, useMemo } from 'react';
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
import { DataView } from '@kbn/data-views-plugin/public';
import { SortOrder } from '@kbn/saved-search-plugin/public';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { SearchResponseWarningsCallout } from '@kbn/search-response-warnings';
import {
  DataLoadingState,
  useColumns,
  type DataTableColumnsMeta,
  getTextBasedColumnsMeta,
  getRenderCustomToolbarWithElements,
} from '@kbn/unified-data-table';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  HIDE_ANNOUNCEMENTS,
  isLegacyTableEnabled,
  MAX_DOC_FIELDS_DISPLAYED,
  ROW_HEIGHT_OPTION,
  SEARCH_FIELDS_FROM_SOURCE,
  SHOW_MULTIFIELDS,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import useObservable from 'react-use/lib/useObservable';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { DiscoverGrid } from '../../../../components/discover_grid';
import { getDefaultRowsPerPage } from '../../../../../common/constants';
import { useInternalStateSelector } from '../../state_management/discover_internal_state_container';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FetchStatus } from '../../../types';
import { DiscoverStateContainer } from '../../state_management/discover_state';
import { useDataState } from '../../hooks/use_data_state';
import { DocTableInfinite } from '../../../../components/doc_table/doc_table_infinite';
import { DocumentExplorerCallout } from '../document_explorer_callout';
import { DocumentExplorerUpdateCallout } from '../document_explorer_callout/document_explorer_update_callout';
import {
  DISCOVER_TOUR_STEP_ANCHOR_IDS,
  DiscoverTourProvider,
} from '../../../../components/discover_tour';
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
import { useProfileAccessor } from '../../../../context_awareness';

const containerStyles = css`
  position: relative;
`;

const progressStyle = css`
  z-index: 2;
`;

const TOUR_STEPS = { expandButton: DISCOVER_TOUR_STEP_ANCHOR_IDS.expandDocument };

const DocTableInfiniteMemoized = React.memo(DocTableInfinite);
const DiscoverGridMemoized = React.memo(DiscoverGrid);

// export needs for testing
export const onResize = (
  colSettings: { columnId: string; width: number },
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
}: {
  viewModeToggle: React.ReactElement | undefined;
  dataView: DataView;
  onAddFilter?: DocViewFilterFn;
  stateContainer: DiscoverStateContainer;
  onFieldEdited?: () => void;
}) {
  const services = useDiscoverServices();
  const documents$ = stateContainer.dataState.data$.documents$;
  const savedSearch = useSavedSearchInitial();
  const { dataViews, capabilities, uiSettings, uiActions } = services;
  const [query, sort, rowHeight, headerRowHeight, rowsPerPage, grid, columns, sampleSizeState] =
    useAppStateSelector((state) => {
      return [
        state.query,
        state.sort,
        state.rowHeight,
        state.headerRowHeight,
        state.rowsPerPage,
        state.grid,
        state.columns,
        state.sampleSize,
      ];
    });
  const expandedDoc = useInternalStateSelector((state) => state.expandedDoc);
  const isEsqlMode = useIsEsqlMode();
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);
  const hideAnnouncements = useMemo(() => uiSettings.get(HIDE_ANNOUNCEMENTS), [uiSettings]);
  const isLegacy = useMemo(
    () => isLegacyTableEnabled({ uiSettings, isEsqlMode }),
    [uiSettings, isEsqlMode]
  );
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
    useInternalStateSelector((state) => state.isDataViewLoading) && !isEsqlMode;
  const isEmptyDataResult =
    isEsqlMode || !documentState.result || documentState.result.length === 0;
  const rows = useMemo(() => documentState.result || [], [documentState.result]);

  const { isMoreDataLoading, totalHits, onFetchMoreRecords } = useFetchMoreRecords({
    stateContainer,
  });

  const {
    columns: currentColumns,
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    setAppState: stateContainer.appState.update,
    useNewFieldsApi,
    columns,
    sort,
  });

  const setExpandedDoc = useCallback(
    (doc: DataTableRecord | undefined) => {
      stateContainer.internalState.transitions.setExpandedDoc(doc);
    },
    [stateContainer]
  );

  const onResizeDataGrid = useCallback(
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
        onRemoveColumn={onRemoveColumn}
        onAddColumn={onAddColumn}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDoc}
        query={query}
      />
    ),
    [dataView, onAddColumn, onAddFilter, onRemoveColumn, query, savedSearch.id, setExpandedDoc]
  );

  const { customControlColumnsConfiguration } = useDiscoverCustomization('data_table') || {};
  const { customCellRenderer, customGridColumnsConfiguration } =
    useContextualGridCustomisations() || {};

  const baseGetCellRenderers = useCallback(
    () => externalCustomRenderers ?? {},
    [externalCustomRenderers]
  );

  const getCellRenderers = useProfileAccessor('getCellRenderers', baseGetCellRenderers);
  const cellRenderers = useMemo(() => getCellRenderers(), [getCellRenderers]);

  const documents = useObservable(stateContainer.dataState.data$.documents$);

  const callouts = useMemo(
    () => (
      <>
        <SelectedVSAvailableCallout
          esqlQueryColumns={documents?.esqlQueryColumns}
          selectedColumns={currentColumns}
        />
        <SearchResponseWarningsCallout warnings={documentState.interceptedWarnings ?? []} />
      </>
    ),
    [currentColumns, documents?.esqlQueryColumns, documentState.interceptedWarnings]
  );

  const gridAnnouncementCallout = useMemo(() => {
    if (hideAnnouncements || isLegacy) {
      return null;
    }

    return !isEsqlMode ? (
      <DiscoverTourProvider>
        <DocumentExplorerUpdateCallout />
      </DiscoverTourProvider>
    ) : null;
  }, [hideAnnouncements, isLegacy, isEsqlMode]);

  const loadingIndicator = useMemo(
    () =>
      isDataLoading ? (
        <EuiProgress
          data-test-subj="discoverDataGridUpdating"
          size="xs"
          color="accent"
          position="absolute"
          css={progressStyle}
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
            {gridAnnouncementCallout}
            {loadingIndicator}
          </>
        ),
      }),
    [viewModeToggle, callouts, gridAnnouncementCallout, loadingIndicator]
  );

  if (isDataViewLoading || (isEmptyDataResult && isDataLoading)) {
    return (
      <div className="dscDocuments__loading">
        <EuiText size="xs" color="subdued">
          <EuiLoadingSpinner />
          <EuiSpacer size="s" />
          <FormattedMessage id="discover.loadingDocuments" defaultMessage="Loading documents" />
        </EuiText>
      </div>
    );
  }

  return (
    <>
      {isLegacy && (
        <>
          <EuiFlexItem grow={false}>{viewModeToggle}</EuiFlexItem>
          {callouts}
        </>
      )}
      <EuiFlexItem className="dscTable" aria-labelledby="documentsAriaLabel" css={containerStyles}>
        <EuiScreenReaderOnly>
          <h2 id="documentsAriaLabel">
            <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
          </h2>
        </EuiScreenReaderOnly>
        {isLegacy && (
          <>
            {rows && rows.length > 0 && (
              <>
                {!hideAnnouncements && <DocumentExplorerCallout />}
                <DocTableInfiniteMemoized
                  columns={currentColumns}
                  dataView={dataView}
                  rows={rows}
                  sort={sort || []}
                  isLoading={isDataLoading}
                  searchDescription={savedSearch.description}
                  sharedItemTitle={savedSearch.title}
                  isEsqlMode={isEsqlMode}
                  onAddColumn={onAddColumn}
                  onFilter={onAddFilter as DocViewFilterFn}
                  onMoveColumn={onMoveColumn}
                  onRemoveColumn={onRemoveColumn}
                  onSort={!isEsqlMode ? onSort : undefined}
                  useNewFieldsApi={useNewFieldsApi}
                  dataTestSubj="discoverDocTable"
                />
              </>
            )}
            {loadingIndicator}
          </>
        )}
        {!isLegacy && (
          <div className="unifiedDataTable">
            <CellActionsProvider
              getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}
            >
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
                useNewFieldsApi={useNewFieldsApi}
                configHeaderRowHeight={3}
                headerRowHeightState={headerRowHeight}
                onUpdateHeaderRowHeight={onUpdateHeaderRowHeight}
                rowHeightState={rowHeight}
                onUpdateRowHeight={onUpdateRowHeight}
                isSortEnabled={true}
                isPlainRecord={isEsqlMode}
                rowsPerPageState={rowsPerPage ?? getDefaultRowsPerPage(services.uiSettings)}
                onUpdateRowsPerPage={onUpdateRowsPerPage}
                maxAllowedSampleSize={getMaxAllowedSampleSize(services.uiSettings)}
                sampleSizeState={getAllowedSampleSize(sampleSizeState, services.uiSettings)}
                onUpdateSampleSize={!isEsqlMode ? onUpdateSampleSize : undefined}
                onFieldEdited={onFieldEdited}
                configRowHeight={uiSettings.get(ROW_HEIGHT_OPTION)}
                showMultiFields={uiSettings.get(SHOW_MULTIFIELDS)}
                maxDocFieldsDisplayed={uiSettings.get(MAX_DOC_FIELDS_DISPLAYED)}
                renderDocumentView={renderDocumentView}
                renderCustomToolbar={renderCustomToolbarWithElements}
                services={services}
                totalHits={totalHits}
                onFetchMoreRecords={onFetchMoreRecords}
                componentsTourSteps={TOUR_STEPS}
                externalCustomRenderers={cellRenderers}
                customGridColumnsConfiguration={customGridColumnsConfiguration}
                customControlColumnsConfiguration={customControlColumnsConfiguration}
              />
            </CellActionsProvider>
          </div>
        )}
      </EuiFlexItem>
    </>
  );
}

export const DiscoverDocuments = memo(DiscoverDocumentsComponent);
