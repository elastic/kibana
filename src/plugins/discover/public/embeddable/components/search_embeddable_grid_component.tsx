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
import { AggregateQuery, Query } from '@kbn/es-query';
import {
  useBatchedOptionalPublishingSubjects,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { SortOrder } from '@kbn/saved-search-plugin/public';
import { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';
import { DataLoadingState } from '@kbn/unified-data-table';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';

import { DiscoverDocTableEmbeddable } from '../../components/doc_table/create_doc_table_embeddable';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getSortForEmbeddable } from '../../utils';
import { getAllowedSampleSize } from '../../utils/get_allowed_sample_size';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID } from '../constants';
import { isEsqlMode } from '../initialize_fetch';
import { SavedSearchAttributesManager } from '../initialize_search_embeddable_api';
import type { EmbeddableComponentSearchProps, SearchEmbeddableApi } from '../types';
import { DiscoverGridEmbeddable } from './saved_search_grid';

interface SavedSearchEmbeddableComponentProps {
  api: SearchEmbeddableApi & { fetchWarnings$: BehaviorSubject<SearchResponseIncompleteWarning[]> };
  query?: AggregateQuery | Query;
  onAddFilter?: DocViewFilterFn;
  stateManager: SavedSearchAttributesManager;
}

const DiscoverDocTableEmbeddableMemoized = React.memo(DiscoverDocTableEmbeddable);
const DiscoverGridEmbeddableMemoized = React.memo(DiscoverGridEmbeddable);

type SavedSearchProps = Omit<
  EmbeddableComponentSearchProps,
  | 'services'
  | 'isLoading'
  | 'rows'
  | 'onFilter'
  | 'useNewFieldsApi'
  | 'showTimeCol'
  | 'ariaLabelledBy'
  | 'cellActionsTriggerId'
  | 'dataView'
> & { dataView?: DataView; sampleSizeState: number | undefined };

export function SearchEmbeddableGridComponent({
  api,
  onAddFilter,
  stateManager,
}: SavedSearchEmbeddableComponentProps) {
  const discoverServices = useDiscoverServices();
  const [
    searchSource,
    dataViews,
    rows,
    totalHitCount,
    columns,
    columnsMeta,
    sort,
    sampleSize,
    rowHeight,
    headerRowHeight,
    rowsPerPage,
    savedSearchId,
    interceptedWarnings,
  ] = useBatchedPublishingSubjects(
    api.searchSource$,
    api.dataViews,
    api.rows$,
    api.totalHitCount$,
    api.columns$,
    api.columnsMeta$,
    api.sort$,
    api.sampleSize$,
    api.rowHeight$,
    api.headerRowHeight$,
    api.rowsPerPage$,
    api.savedObjectId,
    api.fetchWarnings$
  );

  const [panelTitle, panelDescription, savedSearchTitle, savedSearchDescription] =
    useBatchedOptionalPublishingSubjects(
      api.panelTitle,
      api.panelDescription,
      api.defaultPanelTitle,
      api.defaultPanelDescription
    );

  const isEsql = useMemo(() => isEsqlMode({ searchSource }), [searchSource]);

  const savedSearchProps: SavedSearchProps = useMemo(() => {
    return {
      sharedItemTitle: panelTitle || savedSearchTitle,
      searchTitle: panelTitle || savedSearchTitle,
      searchDescription: panelDescription || savedSearchDescription,
      columnsMeta,
      savedSearchId,
      query: searchSource.getField('query'),
      dataView: dataViews?.[0],
      columns: columns ?? [],
      sort: getSortForEmbeddable(sort, dataViews?.[0], discoverServices.uiSettings, isEsql),
      rowHeightState: rowHeight,
      headerRowHeightState: headerRowHeight,
      rowsPerPageState: rowsPerPage,
      sampleSizeState: sampleSize,
      onUpdateRowHeight: (newRowHeight: number | undefined) => {
        stateManager.rowHeight.next(newRowHeight);
      },
      onUpdateHeaderRowHeight: (newHeaderRowHeight: number | undefined) => {
        stateManager.headerRowHeight.next(newHeaderRowHeight);
      },
      onUpdateRowsPerPage: (newRowsPerPage: number | undefined) => {
        stateManager.rowsPerPage.next(newRowsPerPage);
      },
      onUpdateSampleSize: (newSampleSize: number | undefined) => {
        stateManager.sampleSize.next(newSampleSize);
      },
      onSetColumns: (updatedColumns: string[]) => {
        stateManager.columns.next(updatedColumns);
      },
      onSort: (nextSort: string[][]) => {
        const sortOrderArr: SortOrder[] = [];
        nextSort.forEach((arr) => {
          sortOrderArr.push(arr as SortOrder);
        });
        stateManager.sort.next(sortOrderArr);
      },
      interceptedWarnings,
    };
  }, [
    isEsql,
    searchSource,
    panelTitle,
    panelDescription,
    savedSearchTitle,
    savedSearchDescription,
    savedSearchId,
    dataViews,
    columns,
    columnsMeta,
    sort,
    sampleSize,
    rowHeight,
    headerRowHeight,
    rowsPerPage,
    stateManager,
    discoverServices.uiSettings,
    interceptedWarnings,
  ]);

  const useLegacyTable = useMemo(
    () =>
      isLegacyTableEnabled({
        uiSettings: discoverServices.uiSettings,
        isEsqlMode: isEsql,
      }),
    [discoverServices, isEsql]
  );

  const searchProps: EmbeddableComponentSearchProps | undefined = useMemo(() => {
    const { dataView } = savedSearchProps;
    if (!dataView) return;
    return {
      ...savedSearchProps,
      dataView,
      services: discoverServices,
      isLoading: false,
      rows,
      onFilter: onAddFilter,
      totalHitCount,
      useNewFieldsApi: !discoverServices.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false),
      showTimeCol: !discoverServices.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
      ariaLabelledBy: 'documentsAriaLabel',
      cellActionsTriggerId: SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID,
    };
  }, [savedSearchProps, rows, totalHitCount, onAddFilter, discoverServices]);

  const fetchedSampleSize = useMemo(() => {
    return getAllowedSampleSize(savedSearchProps.sampleSizeState, discoverServices.uiSettings);
  }, [savedSearchProps, discoverServices]);

  if (!searchProps) {
    return <></>;
  }

  if (useLegacyTable) {
    return (
      <DiscoverDocTableEmbeddableMemoized
        {...searchProps}
        sampleSizeState={fetchedSampleSize}
        isEsqlMode={isEsql}
      />
    );
  }

  return (
    <DiscoverGridEmbeddableMemoized
      {...searchProps}
      isPlainRecord={isEsql}
      sampleSizeState={fetchedSampleSize}
      loadingState={searchProps.isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
    />
  );
}
