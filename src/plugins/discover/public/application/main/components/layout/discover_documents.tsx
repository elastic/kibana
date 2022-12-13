/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataView } from '@kbn/data-views-plugin/public';
import { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
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
import { DataDocuments$, RecordRawType } from '../../hooks/use_saved_search';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { useDataState } from '../../hooks/use_data_state';
import { DocTableInfinite } from '../../../../components/doc_table/doc_table_infinite';
import { DocumentExplorerCallout } from '../document_explorer_callout';
import { DocumentExplorerUpdateCallout } from '../document_explorer_callout/document_explorer_update_callout';
import { DiscoverTourProvider } from '../../../../components/discover_tour';
import { DataTableRecord } from '../../../../types';
import { getRawRecordType } from '../../utils/get_raw_record_type';
import { getDisplayedColumns } from '../../../../utils/columns';

const DocTableInfiniteMemoized = React.memo(DocTableInfinite);
const DataGridMemoized = React.memo(DiscoverGrid);

// export needs for testing
export const onResize = (
  colSettings: { columnId: string; width: number },
  stateContainer: GetStateReturn,
  state: AppState
) => {
  const grid = { ...(state.grid || {}) };
  const newColumns = { ...(grid.columns || {}) };
  newColumns[colSettings.columnId] = {
    width: Math.round(colSettings.width),
  };
  const newGrid = { ...grid, columns: newColumns };
  stateContainer.setAppState({ grid: newGrid });
};

function DiscoverDocumentsComponent({
  documents$,
  expandedDoc,
  dataView,
  onAddFilter,
  savedSearch,
  setExpandedDoc,
  state,
  stateContainer,
  onFieldEdited,
}: {
  documents$: DataDocuments$;
  expandedDoc?: DataTableRecord;
  dataView: DataView;
  navigateTo: (url: string) => void;
  onAddFilter?: DocViewFilterFn;
  savedSearch: SavedSearch;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  state: AppState;
  stateContainer: GetStateReturn;
  onFieldEdited?: () => void;
}) {
  const { capabilities, dataViews, uiSettings } = useDiscoverServices();
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);
  const hideAnnouncements = useMemo(() => uiSettings.get(HIDE_ANNOUNCEMENTS), [uiSettings]);
  const isLegacy = useMemo(() => uiSettings.get(DOC_TABLE_LEGACY), [uiSettings]);
  const sampleSize = useMemo(() => uiSettings.get(SAMPLE_SIZE_SETTING), [uiSettings]);

  const documentState = useDataState(documents$);
  const isLoading = documentState.fetchStatus === FetchStatus.LOADING;
  const isPlainRecord = useMemo(
    () => getRawRecordType(state.query) === RecordRawType.PLAIN,
    [state.query]
  );
  const rows = useMemo(() => documentState.result || [], [documentState.result]);

  const { columns, onAddColumn, onRemoveColumn, onMoveColumn, onSetColumns } = useColumns({
    capabilities,
    config: uiSettings,
    dataView,
    dataViews,
    setAppState: stateContainer.setAppState,
    state,
    useNewFieldsApi,
  });

  const onResizeDataGrid = useCallback(
    (colSettings) => onResize(colSettings, stateContainer, state),
    [stateContainer, state]
  );

  const onUpdateRowsPerPage = useCallback(
    (rowsPerPage: number) => {
      stateContainer.setAppState({ rowsPerPage });
    },
    [stateContainer]
  );

  const onSort = useCallback(
    (sort: string[][]) => {
      stateContainer.setAppState({ sort });
    },
    [stateContainer]
  );

  const onUpdateRowHeight = useCallback(
    (newRowHeight: number) => {
      stateContainer.setAppState({ rowHeight: newRowHeight });
    },
    [stateContainer]
  );

  const showTimeCol = useMemo(
    () =>
      !isPlainRecord &&
      !uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false) &&
      !!dataView.timeFieldName,
    [isPlainRecord, uiSettings, dataView.timeFieldName]
  );

  // start
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
  // end

  if (
    (!documentState.result || documentState.result.length === 0) &&
    documentState.fetchStatus === FetchStatus.LOADING
  ) {
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
    <EuiFlexItem className="dscTable" aria-labelledby="documentsAriaLabel">
      <EuiScreenReaderOnly>
        <h2 id="documentsAriaLabel">
          <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
        </h2>
      </EuiScreenReaderOnly>
      {isLegacy && rows && rows.length && (
        <>
          {!hideAnnouncements && <DocumentExplorerCallout />}
          <DocTableInfiniteMemoized
            columns={columns}
            dataView={dataView}
            rows={rows}
            sort={state.sort || []}
            isLoading={isLoading}
            searchDescription={savedSearch.description}
            sharedItemTitle={savedSearch.title}
            onAddColumn={onAddColumn}
            onFilter={onAddFilter as DocViewFilterFn}
            onMoveColumn={onMoveColumn}
            onRemoveColumn={onRemoveColumn}
            onSort={!isPlainRecord ? onSort : undefined}
            useNewFieldsApi={useNewFieldsApi}
            dataTestSubj="discoverDocTable"
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
              columns={columns}
              expandedDoc={expandedDoc}
              dataView={dataView}
              isLoading={isLoading}
              rows={rows}
              sort={(state.sort as SortOrder[]) || []}
              sampleSize={sampleSize}
              searchDescription={savedSearch.description}
              searchTitle={savedSearch.title}
              setExpandedDoc={!isPlainRecord ? setExpandedDoc : undefined}
              showTimeCol={showTimeCol}
              settings={state.grid}
              onAddColumn={onAddColumn}
              onFilter={onAddFilter as DocViewFilterFn}
              onRemoveColumn={onRemoveColumn}
              onSetColumns={onSetColumns}
              onSort={!isPlainRecord ? onSort : undefined}
              onResize={onResizeDataGrid}
              useNewFieldsApi={useNewFieldsApi}
              rowHeightState={state.rowHeight}
              onUpdateRowHeight={onUpdateRowHeight}
              isSortEnabled={!isPlainRecord}
              isPlainRecord={isPlainRecord}
              rowsPerPageState={state.rowsPerPage}
              onUpdateRowsPerPage={onUpdateRowsPerPage}
              onFieldEdited={onFieldEdited}
              savedSearchId={savedSearch.id}
              displayedColumns={displayedColumns}
              displayedRows={displayedRows}
              defaultColumns={defaultColumns}
              setSelectedDocs={setSelectedDocs}
              usedSelectedDocs={usedSelectedDocs}
              isFilterActive={isFilterActive}
              setIsFilterActive={setIsFilterActive}
            />
          </div>
        </>
      )}
    </EuiFlexItem>
  );
}

export const DiscoverDocuments = memo(DiscoverDocumentsComponent);
