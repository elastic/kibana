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
import { SearchResponseWarnings } from '@kbn/search-response-warnings';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  DOC_TABLE_LEGACY,
  HIDE_ANNOUNCEMENTS,
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
} from '@kbn/discover-utils';
import { useInternalStateSelector } from '../../services/discover_internal_state_container';
import { useAppStateSelector } from '../../services/discover_app_state_container';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { DataLoadingState, DiscoverGrid } from '../../../../components/discover_grid/discover_grid';
import { FetchStatus } from '../../../types';
import { useColumns } from '../../../../hooks/use_data_grid_columns';
import { RecordRawType } from '../../services/discover_data_state_container';
import { DiscoverStateContainer } from '../../services/discover_state';
import { useDataState } from '../../hooks/use_data_state';
import { DocTableInfinite } from '../../../../components/doc_table/doc_table_infinite';
import { DocumentExplorerCallout } from '../document_explorer_callout';
import { DocumentExplorerUpdateCallout } from '../document_explorer_callout/document_explorer_update_callout';
import { DiscoverTourProvider } from '../../../../components/discover_tour';
import { getRawRecordType } from '../../utils/get_raw_record_type';
import { DiscoverGridFlyout } from '../../../../components/discover_grid/discover_grid_flyout';
import { DocViewer } from '../../../../services/doc_views/components/doc_viewer';
import { useSavedSearchInitial } from '../../services/discover_state_provider';
import { useFetchMoreRecords } from './use_fetch_more_records';

const containerStyles = css`
  position: relative;
`;

const progressStyle = css`
  z-index: 2;
`;

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
  dataView,
  onAddFilter,
  stateContainer,
  onFieldEdited,
}: {
  dataView: DataView;
  onAddFilter?: DocViewFilterFn;
  stateContainer: DiscoverStateContainer;
  onFieldEdited?: () => void;
}) {
  const services = useDiscoverServices();
  const documents$ = stateContainer.dataState.data$.documents$;
  const savedSearch = useSavedSearchInitial();
  const { dataViews, capabilities, uiSettings, uiActions } = services;
  const [query, sort, rowHeight, rowsPerPage, grid, columns, index] = useAppStateSelector(
    (state) => {
      return [
        state.query,
        state.sort,
        state.rowHeight,
        state.rowsPerPage,
        state.grid,
        state.columns,
        state.index,
      ];
    }
  );
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
  const sampleSize = useMemo(() => uiSettings.get(SAMPLE_SIZE_SETTING), [uiSettings]);

  const documentState = useDataState(documents$);
  const isDataLoading =
    documentState.fetchStatus === FetchStatus.LOADING ||
    documentState.fetchStatus === FetchStatus.PARTIAL;
  const isTextBasedQuery = useMemo(() => getRawRecordType(query) === RecordRawType.PLAIN, [query]);
  // This is needed to prevent EuiDataGrid pushing onSort because the data view has been switched.
  // It's just necessary for non-text-based query lang requests since they don't have a partial result state, that's
  // considered as loading state in the Component.
  // 1. When switching the data view, the sorting in the URL is reset to the default sorting of the selected data view.
  // 2. The new sort param is already available in this component and propagated to the EuiDataGrid.
  // 3. currentColumns are still referring to the old state
  // 4. since the new sort by field isn't available in currentColumns EuiDataGrid is emitting a 'onSort', which is unsorting the grid
  // 5. this is propagated to Discover's URL and causes an unwanted change of state to an unsorted state
  // This solution switches to the loading state in this component when the URL index doesn't match the dataView.id
  const isDataViewLoading = !isTextBasedQuery && dataView.id && index !== dataView.id;
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
    config: uiSettings,
    dataView,
    dataViews,
    setAppState: stateContainer.appState.update,
    useNewFieldsApi,
    columns,
    sort,
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
      !isTextBasedQuery &&
      !uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false) &&
      !!dataView.timeFieldName,
    [isTextBasedQuery, uiSettings, dataView.timeFieldName]
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
    <EuiFlexItem className="dscTable" aria-labelledby="documentsAriaLabel" css={containerStyles}>
      <EuiScreenReaderOnly>
        <h2 id="documentsAriaLabel">
          <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
        </h2>
      </EuiScreenReaderOnly>
      {!!documentState.interceptedWarnings?.length && (
        <SearchResponseWarnings
          variant="callout"
          interceptedWarnings={documentState.interceptedWarnings}
          data-test-subj="dscInterceptedWarningsCallout"
        />
      )}
      {isLegacy && rows && rows.length && (
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
            isPlainRecord={isTextBasedQuery}
            onAddColumn={onAddColumn}
            onFilter={onAddFilter as DocViewFilterFn}
            onMoveColumn={onMoveColumn}
            onRemoveColumn={onRemoveColumn}
            onSort={!isTextBasedQuery ? onSort : undefined}
            useNewFieldsApi={useNewFieldsApi}
            dataTestSubj="discoverDocTable"
            DocViewer={DocViewer}
          />
        </>
      )}
      {!isLegacy && (
        <>
          {!hideAnnouncements && !isTextBasedQuery && (
            <DiscoverTourProvider isPlainRecord={isTextBasedQuery}>
              <DocumentExplorerUpdateCallout />
            </DiscoverTourProvider>
          )}
          <div className="dscDiscoverGrid">
            <CellActionsProvider
              getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}
            >
              <DiscoverGridMemoized
                ariaLabelledBy="documentsAriaLabel"
                columns={currentColumns}
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
                sampleSize={sampleSize}
                searchDescription={savedSearch.description}
                searchTitle={savedSearch.title}
                setExpandedDoc={setExpandedDoc}
                showTimeCol={showTimeCol}
                settings={grid}
                onAddColumn={onAddColumn}
                onFilter={onAddFilter as DocViewFilterFn}
                onRemoveColumn={onRemoveColumn}
                onSetColumns={onSetColumns}
                onSort={!isTextBasedQuery ? onSort : undefined}
                onResize={onResizeDataGrid}
                useNewFieldsApi={useNewFieldsApi}
                rowHeightState={rowHeight}
                onUpdateRowHeight={onUpdateRowHeight}
                isSortEnabled={true}
                isPlainRecord={isTextBasedQuery}
                query={query}
                rowsPerPageState={rowsPerPage}
                onUpdateRowsPerPage={onUpdateRowsPerPage}
                onFieldEdited={onFieldEdited}
                savedSearchId={savedSearch.id}
                DocumentView={DiscoverGridFlyout}
                services={services}
                totalHits={totalHits}
                onFetchMoreRecords={onFetchMoreRecords}
              />
            </CellActionsProvider>
          </div>
        </>
      )}
      {isDataLoading && (
        <EuiProgress size="xs" color="accent" position="absolute" css={progressStyle} />
      )}
    </EuiFlexItem>
  );
}

export const DiscoverDocuments = memo(DiscoverDocumentsComponent);
