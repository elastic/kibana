/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, useCallback, useEffect, useMemo } from 'react';
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
import { SortOrder } from '@kbn/saved-search-plugin/public';
import { isEqual } from 'lodash';
import { BehaviorSubject, merge } from 'rxjs';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { useSingleton } from '../../hooks/use_singleton';
import { useInternalStateSelector } from '../../services/discover_internal_state_container';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { DiscoverGrid } from '../../../../components/discover_grid/discover_grid';
import { FetchStatus } from '../../../types';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  DOC_TABLE_LEGACY,
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  HIDE_ANNOUNCEMENTS,
} from '../../../../../common';
import { useColumns } from '../../../../hooks/use_data_grid_columns';
import { DataDocumentsMsg, RecordRawType } from '../../services/discover_data_state_container';
import { DiscoverStateContainer } from '../../services/discover_state';
import { DocTableInfinite } from '../../../../components/doc_table/doc_table_infinite';
import { DocumentExplorerCallout } from '../document_explorer_callout';
import { DocumentExplorerUpdateCallout } from '../document_explorer_callout/document_explorer_update_callout';
import { DiscoverTourProvider } from '../../../../components/discover_tour';
import { DataTableRecord } from '../../../../types';
import { getRawRecordType } from '../../utils/get_raw_record_type';
import { DiscoverGridFlyout } from '../../../../components/discover_grid/discover_grid_flyout';
import { DocViewer } from '../../../../services/doc_views/components/doc_viewer';
import { useSavedSearchInitial } from '../../services/discover_state_provider';

const containerStyles = css`
  position: relative;
`;

const progressStyle = css`
  z-index: 2;
`;
const DocTableInfiniteMemoized = React.memo(DocTableInfinite);
const DataGridMemoized = React.memo(DiscoverGrid);

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

function isSavedSearch(arg: SavedSearch | DataDocumentsMsg): arg is SavedSearch {
  return Boolean('searchSource' in arg);
}
export function useMergedDiscoverState(stateContainer: DiscoverStateContainer) {
  const documents$ = stateContainer.dataState.data$.documents$;
  const state$ = useSingleton(
    () =>
      new BehaviorSubject({
        dataView: stateContainer.savedSearchState.getState().searchSource.getField('index')!,
        appState: stateContainer.appState.getState(),
        isDataLoading: documents$.getValue().fetchStatus === FetchStatus.LOADING,
        rows: documents$.getValue().result,
      })
  );
  useEffect(() => {
    const subscribe = merge(stateContainer.savedSearchState.getCurrent$(), documents$).subscribe(
      (next) => {
        const currentState = state$.getValue();
        if (!isSavedSearch(next)) {
          if (
            next.fetchStatus === FetchStatus.LOADING &&
            !currentState.isDataLoading &&
            !next.result
          ) {
            state$.next({ ...state$.getValue(), isDataLoading: true });
          }

          if (next.fetchStatus === FetchStatus.COMPLETE) {
            const nextMsg = {
              ...state$.getValue(),
              isDataLoading: false,
              rows: next.result,
            };
            if (next.fetchAppState) {
              nextMsg.appState = next.fetchAppState;
            }
            if (next.dataView) {
              nextMsg.dataView = next.dataView;
            }
            state$.next(nextMsg);
          }
        } else if (!currentState.isDataLoading) {
          const nextSavedSearch = next;
          const nextAppState = { ...currentState.appState };
          let setNextAppState = false;

          if (next.columns && !isEqual(next.columns, currentState.appState?.columns)) {
            nextAppState.columns = nextSavedSearch.columns;
            setNextAppState = true;
          }
          if (next.rowHeight && !isEqual(next.rowHeight, currentState.appState?.rowHeight)) {
            nextAppState.rowHeight = nextSavedSearch.rowHeight;
            setNextAppState = true;
          }
          if (next.rowsPerPage && !isEqual(next.rowsPerPage, currentState.appState?.rowsPerPage)) {
            nextAppState.rowsPerPage = nextSavedSearch.rowsPerPage;
            setNextAppState = true;
          }
          if (next.grid && !isEqual(next.grid, currentState.appState?.grid)) {
            nextAppState.grid = nextSavedSearch.grid;
            setNextAppState = true;
          }

          if (next.sort && !isEqual(next.grid, currentState.appState?.sort)) {
            nextAppState.sort = nextSavedSearch.sort;
            setNextAppState = true;
          }

          if (setNextAppState && nextAppState && !isEqual(nextAppState, currentState?.appState)) {
            state$.next({ ...state$.getValue(), appState: nextAppState });
          }
        }
      }
    );
    return () => {
      subscribe.unsubscribe();
    };
  }, [stateContainer, state$, documents$]);
  return useObservable(state$, state$.getValue());
}

function DiscoverDocumentsComponent({
  onAddFilter,
  stateContainer,
  onFieldEdited,
}: {
  onAddFilter: DocViewFilterFn;
  stateContainer: DiscoverStateContainer;
  onFieldEdited: () => void;
}) {
  const services = useDiscoverServices();
  const { dataViews, capabilities, uiSettings } = services;
  const { dataView, appState, isDataLoading, rows } = useMergedDiscoverState(stateContainer);
  const savedSearchInital = useSavedSearchInitial();

  const { rowHeight, rowsPerPage, grid, query, sort, columns } = appState;
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

  // This is needed to prevent EuiDataGrid pushing onSort because the data view has been switched.
  // 1. When switching the data view, the sorting in the URL is reset to the default sorting of the selected data view.
  // 2. The new sort param is already available in this component and propagated to the EuiDataGrid.
  // 3. currentColumns are still referring to the old state
  // 4. since the new sort by field isn't available in currentColumns EuiDataGrid is emitting a 'onSort', which is unsorting the grid
  // 5. this is propagated to Discover's URL and causes an unwanted change of state to an unsorted state
  // This solution switches to the loading state in this component when the URL index doesn't match the dataView.id
  const isEmptyDataResult = !rows || rows.length === 0;
  const isPlainRecord = useMemo(() => getRawRecordType(query) === RecordRawType.PLAIN, [query]);

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
    isTextBasedQueryLanguage: isPlainRecord,
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
      !isPlainRecord &&
      !uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false) &&
      !!dataView?.timeFieldName,
    [isPlainRecord, uiSettings, dataView?.timeFieldName]
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
    <EuiFlexItem className="dscTable" aria-labelledby="documentsAriaLabel" css={containerStyles}>
      <EuiScreenReaderOnly>
        <h2 id="documentsAriaLabel">
          <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
        </h2>
      </EuiScreenReaderOnly>
      {isLegacy && rows && rows.length && (
        <>
          {!hideAnnouncements && <DocumentExplorerCallout />}
          <DocTableInfiniteMemoized
            columns={currentColumns}
            dataView={dataView}
            rows={rows}
            sort={sort || []}
            isLoading={isDataLoading}
            searchDescription={savedSearchInital.description}
            sharedItemTitle={savedSearchInital.title}
            isPlainRecord={isPlainRecord}
            onAddColumn={onAddColumn}
            onFilter={!isPlainRecord ? onAddFilter : undefined}
            onMoveColumn={onMoveColumn}
            onRemoveColumn={onRemoveColumn}
            onSort={!isPlainRecord ? onSort : undefined}
            useNewFieldsApi={useNewFieldsApi}
            dataTestSubj="discoverDocTable"
            DocViewer={DocViewer}
          />
        </>
      )}
      {!isLegacy && (
        <>
          {!hideAnnouncements && !isPlainRecord && (
            <DiscoverTourProvider isPlainRecord={isPlainRecord}>
              <DocumentExplorerUpdateCallout />
            </DiscoverTourProvider>
          )}
          <div className="dscDiscoverGrid">
            <DataGridMemoized
              ariaLabelledBy="documentsAriaLabel"
              columns={currentColumns}
              expandedDoc={expandedDoc}
              dataView={dataView}
              isLoading={isDataLoading}
              rows={rows}
              sort={(sort as SortOrder[]) || []}
              sampleSize={sampleSize}
              searchDescription={savedSearchInital.description}
              searchTitle={savedSearchInital.title}
              setExpandedDoc={setExpandedDoc}
              showTimeCol={showTimeCol}
              settings={grid}
              onAddColumn={onAddColumn}
              onFilter={!isPlainRecord ? onAddFilter : undefined}
              onRemoveColumn={onRemoveColumn}
              onSetColumns={onSetColumns}
              onSort={!isPlainRecord ? onSort : undefined}
              onResize={onResizeDataGrid}
              useNewFieldsApi={useNewFieldsApi}
              rowHeightState={rowHeight}
              onUpdateRowHeight={onUpdateRowHeight}
              isSortEnabled={true}
              isPlainRecord={isPlainRecord}
              query={query}
              rowsPerPageState={rowsPerPage}
              onUpdateRowsPerPage={onUpdateRowsPerPage}
              onFieldEdited={!isPlainRecord ? onFieldEdited : undefined}
              savedSearchId={savedSearchInital.id}
              DocumentView={DiscoverGridFlyout}
              services={services}
            />
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
