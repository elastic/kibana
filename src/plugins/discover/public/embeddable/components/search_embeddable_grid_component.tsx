/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import type { DataView } from '@kbn/data-views-plugin/common';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  isLegacyTableEnabled,
  SEARCH_FIELDS_FROM_SOURCE,
} from '@kbn/discover-utils';
import { Filter } from '@kbn/es-query';
import {
  useBatchedOptionalPublishingSubjects,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { SortOrder } from '@kbn/saved-search-plugin/public';
import { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';
import { columnActions, DataLoadingState } from '@kbn/unified-data-table';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';

import { DiscoverDocTableEmbeddable } from '../../components/doc_table/create_doc_table_embeddable';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getSortForEmbeddable } from '../../utils';
import { getAllowedSampleSize } from '../../utils/get_allowed_sample_size';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID } from '../constants';
import { isEsqlMode } from '../initialize_fetch';
import type { SearchEmbeddableApi, SearchEmbeddableStateManager } from '../types';
import { DiscoverGridEmbeddable } from './saved_search_grid';

interface SavedSearchEmbeddableComponentProps {
  api: SearchEmbeddableApi & { fetchWarnings$: BehaviorSubject<SearchResponseIncompleteWarning[]> };
  dataView: DataView;
  onAddFilter?: DocViewFilterFn;
  stateManager: SearchEmbeddableStateManager;
}

const DiscoverDocTableEmbeddableMemoized = React.memo(DiscoverDocTableEmbeddable);
const DiscoverGridEmbeddableMemoized = React.memo(DiscoverGridEmbeddable);

export function SearchEmbeddableGridComponent({
  api,
  dataView,
  onAddFilter,
  stateManager,
}: SavedSearchEmbeddableComponentProps) {
  const discoverServices = useDiscoverServices();
  const [
    loading,
    savedSearch,
    savedSearchId,
    interceptedWarnings,
    rows,
    totalHitCount,
    columnsMeta,
  ] = useBatchedPublishingSubjects(
    api.dataLoading,
    api.savedSearch$,
    api.savedObjectId,
    api.fetchWarnings$,
    stateManager.rows,
    stateManager.totalHitCount,
    stateManager.columnsMeta
  );

  const [panelTitle, panelDescription, savedSearchTitle, savedSearchDescription] =
    useBatchedOptionalPublishingSubjects(
      api.panelTitle,
      api.panelDescription,
      api.defaultPanelTitle,
      api.defaultPanelDescription
    );

  const isEsql = useMemo(() => isEsqlMode(savedSearch), [savedSearch]);
  const useLegacyTable = useMemo(
    () =>
      isLegacyTableEnabled({
        uiSettings: discoverServices.uiSettings,
        isEsqlMode: isEsql,
      }),
    [discoverServices, isEsql]
  );

  const sort = useMemo(() => {
    return getSortForEmbeddable(savedSearch.sort, dataView, discoverServices.uiSettings, isEsql);
  }, [savedSearch.sort, dataView, isEsql, discoverServices.uiSettings]);

  const onStateEditedProps = useMemo(
    () => ({
      onAddColumn: (columnName: string) => {
        if (!savedSearch.columns) {
          return;
        }
        const updatedColumns = columnActions.addColumn(savedSearch.columns, columnName, true);
        stateManager.columns.next(updatedColumns);
      },
      onSetColumns: (updatedColumns: string[]) => {
        stateManager.columns.next(updatedColumns);
      },
      onMoveColumn: (columnName: string, newIndex: number) => {
        if (!savedSearch.columns) {
          return;
        }
        const updatedColumns = columnActions.moveColumn(savedSearch.columns, columnName, newIndex);
        stateManager.columns.next(updatedColumns);
      },
      onRemoveColumn: (columnName: string) => {
        if (!savedSearch.columns) {
          return;
        }
        const updatedColumns = columnActions.removeColumn(savedSearch.columns, columnName, true);
        stateManager.columns.next(updatedColumns);
      },
      onUpdateRowsPerPage: (newRowsPerPage: number | undefined) => {
        stateManager.rowsPerPage.next(newRowsPerPage);
      },
      onUpdateRowHeight: (newRowHeight: number | undefined) => {
        stateManager.rowHeight.next(newRowHeight);
      },
      onUpdateHeaderRowHeight: (newHeaderRowHeight: number | undefined) => {
        stateManager.headerRowHeight.next(newHeaderRowHeight);
      },
      onSort: (nextSort: string[][]) => {
        const sortOrderArr: SortOrder[] = [];
        nextSort.forEach((arr) => {
          sortOrderArr.push(arr as SortOrder);
        });
        stateManager.sort.next(sortOrderArr);
      },
      onUpdateSampleSize: (newSampleSize: number | undefined) => {
        stateManager.sampleSize.next(newSampleSize);
      },
    }),
    [stateManager, savedSearch.columns]
  );

  const fetchedSampleSize = useMemo(() => {
    return getAllowedSampleSize(savedSearch.sampleSize, discoverServices.uiSettings);
  }, [savedSearch.sampleSize, discoverServices]);

  if (useLegacyTable) {
    return (
      <DiscoverDocTableEmbeddableMemoized
        {...onStateEditedProps}
        columns={savedSearch.columns ?? []}
        dataView={dataView}
        filters={savedSearch.searchSource.getField('filter') as Filter[]}
        interceptedWarnings={interceptedWarnings}
        isEsqlMode={isEsql}
        isLoading={Boolean(loading)}
        onFilter={onAddFilter}
        rows={rows}
        rowsPerPageState={savedSearch.rowsPerPage}
        sampleSizeState={fetchedSampleSize}
        searchDescription={panelDescription || savedSearchDescription}
        sharedItemTitle={panelTitle || savedSearchTitle}
        sort={sort}
        totalHitCount={totalHitCount}
        useNewFieldsApi={!discoverServices.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false)}
      />
    );
  }

  return (
    <DiscoverGridEmbeddableMemoized
      {...onStateEditedProps}
      ariaLabelledBy={'documentsAriaLabel'}
      cellActionsTriggerId={SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID}
      columns={savedSearch.columns ?? []}
      columnsMeta={columnsMeta}
      dataView={dataView}
      headerRowHeightState={savedSearch.headerRowHeight}
      interceptedWarnings={interceptedWarnings}
      isPlainRecord={isEsql}
      loadingState={Boolean(loading) ? DataLoadingState.loading : DataLoadingState.loaded}
      onFilter={onAddFilter}
      query={savedSearch.searchSource.getField('query')}
      rowHeightState={savedSearch.rowHeight}
      rows={rows}
      rowsPerPageState={savedSearch.rowsPerPage}
      sampleSizeState={fetchedSampleSize}
      savedSearchId={savedSearchId}
      searchDescription={panelDescription || savedSearchDescription}
      searchTitle={panelTitle || savedSearchTitle}
      services={discoverServices}
      showTimeCol={!discoverServices.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false)}
      sort={sort}
      totalHitCount={totalHitCount}
      useNewFieldsApi={!discoverServices.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false)}
    />
  );
}
