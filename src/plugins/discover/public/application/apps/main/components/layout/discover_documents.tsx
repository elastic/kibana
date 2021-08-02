/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useRef, useMemo, useCallback, memo } from 'react';
import { EuiFlexItem, EuiSpacer, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DocTableLegacy } from '../../../../angular/doc_table/create_doc_table_react';
import { SortPairArr } from '../../../../angular/doc_table/lib/get_sort';
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

const DocTableLegacyMemoized = React.memo(DocTableLegacy);
const DataGridMemoized = React.memo(DiscoverGrid);

function DiscoverDocumentsComponent({
  documents$,
  expandedDoc,
  indexPattern,
  isMobile,
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
  isMobile: () => boolean;
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

  const scrollableDesktop = useRef<HTMLDivElement>(null);
  const isLegacy = useMemo(() => uiSettings.get(DOC_TABLE_LEGACY), [uiSettings]);
  const sampleSize = useMemo(() => uiSettings.get(SAMPLE_SIZE_SETTING), [uiSettings]);

  const documentState: DataDocumentsMsg = useDataState(documents$);

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

  /**
   * Legacy function, remove once legacy grid is removed
   */
  const onBackToTop = useCallback(() => {
    if (scrollableDesktop && scrollableDesktop.current) {
      scrollableDesktop.current.focus();
    }
    // Only the desktop one needs to target a specific container
    if (!isMobile() && scrollableDesktop.current) {
      scrollableDesktop.current.scrollTo(0, 0);
    } else if (window) {
      window.scrollTo(0, 0);
    }
  }, [scrollableDesktop, isMobile]);

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
    <EuiFlexItem className="eui-yScroll">
      <section
        className="dscTable eui-yScroll eui-xScroll"
        aria-labelledby="documentsAriaLabel"
        ref={scrollableDesktop}
        tabIndex={-1}
      >
        <h2 className="euiScreenReaderOnly" id="documentsAriaLabel">
          <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
        </h2>
        {isLegacy && rows && rows.length && (
          <DocTableLegacyMemoized
            columns={columns}
            indexPattern={indexPattern}
            rows={rows}
            sort={state.sort || []}
            searchDescription={savedSearch.description}
            searchTitle={savedSearch.lastSavedTitle}
            onAddColumn={onAddColumn}
            onBackToTop={onBackToTop}
            onFilter={onAddFilter}
            onMoveColumn={onMoveColumn}
            onRemoveColumn={onRemoveColumn}
            onSort={onSort}
            sampleSize={sampleSize}
            useNewFieldsApi={useNewFieldsApi}
          />
        )}
        {!isLegacy && (
          <div className="dscDiscoverGrid">
            <DataGridMemoized
              ariaLabelledBy="documentsAriaLabel"
              columns={columns}
              expandedDoc={expandedDoc}
              indexPattern={indexPattern}
              isLoading={documentState.fetchStatus === FetchStatus.LOADING}
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
      </section>
    </EuiFlexItem>
  );
}

export const DiscoverDocuments = memo(DiscoverDocumentsComponent);
