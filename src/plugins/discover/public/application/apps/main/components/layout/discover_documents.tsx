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
import { FormattedMessage } from '@kbn/i18n/react';
import { DocViewFilterFn, ElasticSearchHit } from '../../../../doc_views/doc_views_types';
import { DiscoverGrid } from '../../../../components/discover_grid/discover_grid';
import { FetchStatus } from '../../../../types';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  DOC_TABLE_LEGACY,
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
} from '../../../../../../common';
import { useDataGridColumns } from '../../../../helpers/use_data_grid_columns';
import { IndexPattern } from '../../../../../../../data/common';
import { SavedSearch } from '../../../../../saved_searches';
import { DataDocumentsMsg, DataDocuments$ } from '../../services/use_saved_search';
import { DiscoverServices } from '../../../../../build_services';
import { AppState, GetStateReturn } from '../../services/discover_state';
import { useDataState } from '../../utils/use_data_state';
import { DocTableInfinite } from '../doc_table/doc_table_infinite';
import { SortPairArr } from '../doc_table/lib/get_sort';

const DocTableInfiniteMemoized = React.memo(DocTableInfinite);
const DataGridMemoized = React.memo(DiscoverGrid);

function DiscoverDocumentsComponent({
  documents$,
  expandedDoc,
  indexPattern,
  onAddFilter,
  savedSearch,
  services,
  setExpandedDoc,
  state,
  stateContainer,
}: {
  documents$: DataDocuments$;
  expandedDoc?: ElasticSearchHit;
  indexPattern: IndexPattern;
  navigateTo: (url: string) => void;
  onAddFilter: DocViewFilterFn;
  savedSearch: SavedSearch;
  services: DiscoverServices;
  setExpandedDoc: (doc: ElasticSearchHit | undefined) => void;
  state: AppState;
  stateContainer: GetStateReturn;
}) {
  const { capabilities, indexPatterns, uiSettings } = services;
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);

  const isLegacy = useMemo(() => uiSettings.get(DOC_TABLE_LEGACY), [uiSettings]);
  const sampleSize = useMemo(() => uiSettings.get(SAMPLE_SIZE_SETTING), [uiSettings]);

  const documentState: DataDocumentsMsg = useDataState(documents$);
  const isLoading = documentState.fetchStatus === FetchStatus.LOADING;

  const rows = useMemo(() => documentState.result || [], [documentState.result]);

  const { columns, onAddColumn, onRemoveColumn, onMoveColumn, onSetColumns } = useDataGridColumns({
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
      const grid = { ...state.grid } || {};
      const newColumns = { ...grid.columns } || {};
      newColumns[colSettings.columnId] = {
        width: colSettings.width,
      };
      const newGrid = { ...grid, columns: newColumns };
      stateContainer.setAppState({ grid: newGrid });
    },
    [stateContainer, state]
  );

  const onSort = useCallback(
    (sort: string[][]) => {
      stateContainer.setAppState({ sort });
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
    <EuiFlexItem className="dscTable" tabIndex={-1} aria-labelledby="documentsAriaLabel">
      <EuiScreenReaderOnly>
        <h2 id="documentsAriaLabel">
          <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
        </h2>
      </EuiScreenReaderOnly>
      {isLegacy && rows && rows.length && (
        <DocTableInfiniteMemoized
          columns={columns}
          indexPattern={indexPattern}
          rows={rows}
          sort={state.sort || []}
          isLoading={isLoading}
          searchDescription={savedSearch.description}
          sharedItemTitle={savedSearch.lastSavedTitle}
          onAddColumn={onAddColumn}
          onFilter={onAddFilter as DocViewFilterFn}
          onMoveColumn={onMoveColumn}
          onRemoveColumn={onRemoveColumn}
          onSort={onSort}
          useNewFieldsApi={useNewFieldsApi}
          dataTestSubj="discoverDocTable"
        />
      )}
      {!isLegacy && (
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
            searchTitle={savedSearch.lastSavedTitle}
            setExpandedDoc={setExpandedDoc}
            showTimeCol={showTimeCol}
            services={services}
            settings={state.grid}
            onAddColumn={onAddColumn}
            onFilter={onAddFilter as DocViewFilterFn}
            onRemoveColumn={onRemoveColumn}
            onSetColumns={onSetColumns}
            onSort={onSort}
            onResize={onResize}
            useNewFieldsApi={useNewFieldsApi}
          />
        </div>
      )}
    </EuiFlexItem>
  );
}

export const DiscoverDocuments = memo(DiscoverDocumentsComponent);
