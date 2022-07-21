/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo, useCallback, memo } from 'react';
import {
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataView } from '@kbn/data-views-plugin/public';
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
import { SavedSearch } from '../../../../services/saved_searches';
import { DataDocumentsMsg, DataDocuments$ } from '../../hooks/use_saved_search';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { useDataState } from '../../hooks/use_data_state';
import { DocTableInfinite } from '../../../../components/doc_table/doc_table_infinite';
import { SortPairArr } from '../../../../components/doc_table/utils/get_sort';
import { DocumentExplorerCallout } from '../document_explorer_callout';
import { DocumentExplorerUpdateCallout } from '../document_explorer_callout/document_explorer_update_callout';
import { DiscoverTourProvider } from '../../../../components/discover_tour';
import { DataTableRecord } from '../../../../types';

const DocTableInfiniteMemoized = React.memo(DocTableInfinite);
const DataGridMemoized = React.memo(DiscoverGrid);

function DiscoverDocumentsComponent({
  documents$,
  expandedDoc,
  indexPattern,
  onAddFilter,
  savedSearch,
  setExpandedDoc,
  state,
  stateContainer,
  onFieldEdited,
}: {
  documents$: DataDocuments$;
  expandedDoc?: DataTableRecord;
  indexPattern: DataView;
  navigateTo: (url: string) => void;
  onAddFilter: DocViewFilterFn;
  savedSearch: SavedSearch;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  state: AppState;
  stateContainer: GetStateReturn;
  onFieldEdited: () => void;
}) {
  const { capabilities, indexPatterns, uiSettings } = useDiscoverServices();
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);
  const hideAnnouncements = useMemo(() => uiSettings.get(HIDE_ANNOUNCEMENTS), [uiSettings]);
  const isLegacy = useMemo(() => uiSettings.get(DOC_TABLE_LEGACY), [uiSettings]);
  const sampleSize = useMemo(() => uiSettings.get(SAMPLE_SIZE_SETTING), [uiSettings]);

  const documentState: DataDocumentsMsg = useDataState(documents$);
  const isLoading = documentState.fetchStatus === FetchStatus.LOADING;

  const rows = useMemo(() => documentState.result || [], [documentState.result]);

  const { columns, onAddColumn, onRemoveColumn, onMoveColumn, onSetColumns } = useColumns({
    capabilities,
    config: uiSettings,
    indexPattern,
    indexPatterns,
    setAppState: stateContainer.setAppState,
    state,
    useNewFieldsApi,
  });

  const onResize = useCallback(
    (colSettings: { columnId: string; width: number }) => {
      const grid = { ...(state.grid || {}) };
      const newColumns = { ...(grid.columns || {}) };
      newColumns[colSettings.columnId] = {
        width: colSettings.width,
      };
      const newGrid = { ...grid, columns: newColumns };
      stateContainer.setAppState({ grid: newGrid });
    },
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
    () => !uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false) && !!indexPattern.timeFieldName,
    [uiSettings, indexPattern.timeFieldName]
  );

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
            indexPattern={indexPattern}
            rows={rows}
            sort={state.sort || []}
            isLoading={isLoading}
            searchDescription={savedSearch.description}
            sharedItemTitle={savedSearch.title}
            onAddColumn={onAddColumn}
            onFilter={onAddFilter as DocViewFilterFn}
            onMoveColumn={onMoveColumn}
            onRemoveColumn={onRemoveColumn}
            onSort={onSort}
            useNewFieldsApi={useNewFieldsApi}
            dataTestSubj="discoverDocTable"
          />
        </>
      )}
      {!isLegacy && (
        <>
          {!hideAnnouncements && (
            <DiscoverTourProvider>
              <DocumentExplorerUpdateCallout />
            </DiscoverTourProvider>
          )}
          <div className="dscDiscoverGrid">
            <DataGridMemoized
              ariaLabelledBy="documentsAriaLabel"
              columns={columns}
              expandedDoc={expandedDoc}
              indexPattern={indexPattern}
              isLoading={isLoading}
              rows={rows}
              sort={(state.sort as SortPairArr[]) || []}
              sampleSize={sampleSize}
              searchDescription={savedSearch.description}
              searchTitle={savedSearch.title}
              setExpandedDoc={setExpandedDoc}
              showTimeCol={showTimeCol}
              settings={state.grid}
              onAddColumn={onAddColumn}
              onFilter={onAddFilter as DocViewFilterFn}
              onRemoveColumn={onRemoveColumn}
              onSetColumns={onSetColumns}
              onSort={onSort}
              onResize={onResize}
              useNewFieldsApi={useNewFieldsApi}
              rowHeightState={state.rowHeight}
              onUpdateRowHeight={onUpdateRowHeight}
              rowsPerPageState={state.rowsPerPage}
              onUpdateRowsPerPage={onUpdateRowsPerPage}
              onFieldEdited={onFieldEdited}
            />
          </div>
        </>
      )}
    </EuiFlexItem>
  );
}

export const DiscoverDocuments = memo(DiscoverDocumentsComponent);
