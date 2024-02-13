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
  type DataTableColumnTypes,
  getTextBasedColumnTypes,
} from '@kbn/unified-data-table';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  DOC_TABLE_LEGACY,
  HIDE_ANNOUNCEMENTS,
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
import { useInternalStateSelector } from '../../services/discover_internal_state_container';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FetchStatus } from '../../../types';
import { RecordRawType } from '../../services/discover_data_state_container';
import { DiscoverStateContainer } from '../../services/discover_state';
import { useDataState } from '../../hooks/use_data_state';
import { DocTableInfinite } from '../../../../components/doc_table/doc_table_infinite';
import { DocumentExplorerCallout } from '../document_explorer_callout';
import { DocumentExplorerUpdateCallout } from '../document_explorer_callout/document_explorer_update_callout';
import {
  DISCOVER_TOUR_STEP_ANCHOR_IDS,
  DiscoverTourProvider,
} from '../../../../components/discover_tour';
import { getRawRecordType } from '../../utils/get_raw_record_type';
import {
  getMaxAllowedSampleSize,
  getAllowedSampleSize,
} from '../../../../utils/get_allowed_sample_size';
import { DiscoverGridFlyout } from '../../../../components/discover_grid_flyout';
import { getRenderCustomToolbarWithElements } from '../../../../components/discover_grid/render_custom_toolbar';
import { useSavedSearchInitial, useSavedSearch } from '../../services/discover_state_provider';
import { useFetchMoreRecords } from './use_fetch_more_records';
import { SelectedVSAvailableCallout } from './selected_vs_available_callout';
import { useDiscoverCustomization } from '../../../../customizations';

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
  const grid = { ...(state.grid || {}) };
  const newColumns = { ...(grid.columns || {}) };
  newColumns[colSettings.columnId] = {
    width: Math.round(colSettings.width),
  };
  const newGrid = { ...grid, columns: newColumns };
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
  dataView?: DataView;
  onAddFilter?: DocViewFilterFn;
  stateContainer: DiscoverStateContainer;
  onFieldEdited?: () => void;
}) {
  const services = useDiscoverServices();
  const documents$ = stateContainer.dataState.data$.documents$;
  const savedSearch = useSavedSearchInitial();
  const savedSearchEdited = useSavedSearch();
  const { dataViews, capabilities, uiSettings, uiActions } = services;

  const setExpandedDoc = useCallback(
    (doc: DataTableRecord | undefined) => {
      stateContainer.internalState.transitions.setExpandedDoc(doc);
    },
    [stateContainer]
  );

  const expandedDoc = useInternalStateSelector((state) => state.expandedDoc);

  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);
  const hideAnnouncements = useMemo(() => uiSettings.get(HIDE_ANNOUNCEMENTS), [uiSettings]);
  const isLegacy = useMemo(() => uiSettings.get(DOC_TABLE_LEGACY), [uiSettings]);

  const documentState = useDataState(documents$);
  const isDataLoading =
    documentState.fetchStatus === FetchStatus.LOADING ||
    documentState.fetchStatus === FetchStatus.PARTIAL;
  const isTextBasedQuery = useMemo(
    () =>
      getRawRecordType(savedSearchEdited.searchSource.getField('query')) === RecordRawType.PLAIN,
    [savedSearchEdited]
  );
  const isEmptyDataResult =
    isTextBasedQuery || !documentState.result || documentState.result.length === 0;
  const rows = useMemo(() => documentState.result || [], [documentState.result]);

  const { isMoreDataLoading, totalHits, onFetchMoreRecords } = useFetchMoreRecords({
    isTextBasedQuery,
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
    columns: savedSearchEdited.columns,
    sort: savedSearchEdited.sort,
  });

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

  const showTimeCol = useMemo(
    () =>
      // for ES|QL we want to show the time column only when is on Document view
      (!isTextBasedQuery || !savedSearchEdited.columns?.length) &&
      !uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false) &&
      !!dataView?.timeFieldName,
    [isTextBasedQuery, savedSearchEdited.columns, uiSettings, dataView?.timeFieldName]
  );

  const columnTypes: DataTableColumnTypes | undefined = useMemo(
    () =>
      documentState.textBasedQueryColumns
        ? getTextBasedColumnTypes(documentState.textBasedQueryColumns)
        : undefined,
    [documentState.textBasedQueryColumns]
  );

  const renderDocumentView = useCallback(
    (
      hit: DataTableRecord,
      displayedRows: DataTableRecord[],
      displayedColumns: string[],
      customColumnTypes?: DataTableColumnTypes
    ) => (
      <DiscoverGridFlyout
        dataView={dataView}
        hit={hit}
        hits={displayedRows}
        // if default columns are used, dont make them part of the URL - the context state handling will take care to restore them
        columns={displayedColumns}
        columnTypes={customColumnTypes}
        savedSearchId={savedSearch.id}
        onFilter={onAddFilter}
        onRemoveColumn={onRemoveColumn}
        onAddColumn={onAddColumn}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDoc}
        query={savedSearchEdited.searchSource.getField('query')}
      />
    ),
    [
      dataView,
      onAddColumn,
      onAddFilter,
      onRemoveColumn,
      savedSearchEdited,
      savedSearch.id,
      setExpandedDoc,
    ]
  );

  const {
    customCellRenderer: externalCustomRenderers,
    customGridColumnsConfiguration,
    customControlColumnsConfiguration,
  } = useDiscoverCustomization('data_table') || {};

  const documents = useObservable(stateContainer.dataState.data$.documents$);

  const callouts = useMemo(
    () => (
      <>
        <SelectedVSAvailableCallout
          isPlainRecord={isTextBasedQuery}
          textBasedQueryColumns={documents?.textBasedQueryColumns}
          selectedColumns={currentColumns}
        />
        <SearchResponseWarningsCallout warnings={documentState.interceptedWarnings ?? []} />
      </>
    ),
    [
      isTextBasedQuery,
      currentColumns,
      documents?.textBasedQueryColumns,
      documentState.interceptedWarnings,
    ]
  );

  const gridAnnouncementCallout = useMemo(() => {
    if (hideAnnouncements || isLegacy) {
      return null;
    }

    return !isTextBasedQuery ? (
      <DiscoverTourProvider isPlainRecord={isTextBasedQuery}>
        <DocumentExplorerUpdateCallout />
      </DiscoverTourProvider>
    ) : null;
  }, [hideAnnouncements, isLegacy, isTextBasedQuery]);

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

  const renderCustomToolbar = useMemo(
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

  if (isEmptyDataResult && isDataLoading) {
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
        {isLegacy && dataView && (
          <>
            {rows && rows.length > 0 && (
              <>
                {!hideAnnouncements && <DocumentExplorerCallout />}
                <DocTableInfiniteMemoized
                  columns={currentColumns}
                  dataView={dataView}
                  rows={rows}
                  sort={savedSearchEdited.sort || []}
                  isLoading={isDataLoading}
                  searchDescription={savedSearch.description}
                  sharedItemTitle={savedSearch.title}
                  isPlainRecord={isTextBasedQuery}
                  onAddColumn={onAddColumn}
                  onFilter={onAddFilter as DocViewFilterFn}
                  onMoveColumn={onMoveColumn}
                  onRemoveColumn={onRemoveColumn}
                  onSort={!isTextBasedQuery ? onSort : undefined}
                  useNewFieldsApi={useNewFieldsApi}
                  dataTestSubj="discoverDocTable"
                />
              </>
            )}
            {loadingIndicator}
          </>
        )}
        {!isLegacy && (
          <>
            <div className="unifiedDataTable">
              <CellActionsProvider
                getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}
              >
                <DiscoverGridMemoized
                  ariaLabelledBy="documentsAriaLabel"
                  columns={currentColumns}
                  columnTypes={columnTypes}
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
                  sort={(savedSearchEdited.sort as SortOrder[]) || []}
                  searchDescription={savedSearch.description}
                  searchTitle={savedSearch.title}
                  setExpandedDoc={setExpandedDoc}
                  showTimeCol={showTimeCol}
                  settings={savedSearch.grid}
                  onFilter={onAddFilter as DocViewFilterFn}
                  onSetColumns={onSetColumns}
                  onSort={!isTextBasedQuery ? onSort : undefined}
                  onResize={onResizeDataGrid}
                  useNewFieldsApi={useNewFieldsApi}
                  rowHeightState={savedSearchEdited.rowHeight}
                  onUpdateRowHeight={onUpdateRowHeight}
                  isSortEnabled={isTextBasedQuery ? Boolean(currentColumns.length) : true}
                  isPlainRecord={isTextBasedQuery}
                  rowsPerPageState={
                    savedSearchEdited.rowsPerPage ?? getDefaultRowsPerPage(services.uiSettings)
                  }
                  onUpdateRowsPerPage={onUpdateRowsPerPage}
                  maxAllowedSampleSize={getMaxAllowedSampleSize(services.uiSettings)}
                  sampleSizeState={getAllowedSampleSize(
                    savedSearchEdited.sampleSize,
                    services.uiSettings
                  )}
                  onUpdateSampleSize={!isTextBasedQuery ? onUpdateSampleSize : undefined}
                  onFieldEdited={onFieldEdited}
                  configRowHeight={uiSettings.get(ROW_HEIGHT_OPTION)}
                  showMultiFields={uiSettings.get(SHOW_MULTIFIELDS)}
                  maxDocFieldsDisplayed={uiSettings.get(MAX_DOC_FIELDS_DISPLAYED)}
                  renderDocumentView={renderDocumentView}
                  renderCustomToolbar={renderCustomToolbar}
                  services={services}
                  totalHits={totalHits}
                  onFetchMoreRecords={onFetchMoreRecords}
                  componentsTourSteps={TOUR_STEPS}
                  headerRowHeight={3}
                  externalCustomRenderers={externalCustomRenderers}
                  customGridColumnsConfiguration={customGridColumnsConfiguration}
                  customControlColumnsConfiguration={customControlColumnsConfiguration}
                />
              </CellActionsProvider>
            </div>
          </>
        )}
      </EuiFlexItem>
    </>
  );
}

export const DiscoverDocuments = memo(DiscoverDocumentsComponent);
