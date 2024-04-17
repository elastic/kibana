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
import { DataTableRecord } from '@kbn/discover-utils/types';
import { AggregateQuery, Query } from '@kbn/es-query';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import { DataLoadingState } from '@kbn/unified-data-table';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';

import { isTextBasedQuery } from '../../application/main/utils/is_text_based_query';
import { DiscoverDocTableEmbeddable } from '../../components/doc_table/create_doc_table_embeddable';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getSortForEmbeddable } from '../../utils';
import { getAllowedSampleSize } from '../../utils/get_allowed_sample_size';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID } from '../constants';
import { DiscoverGridEmbeddable } from './saved_search_grid';
import type { EmbeddableComponentSearchProps, SearchEmbeddableApi } from '../types';

interface SavedSearchEmbeddableComponentProps {
  api: SearchEmbeddableApi & {
    savedSearch$: BehaviorSubject<SavedSearch>;
    rows$: BehaviorSubject<DataTableRecord[]>;
  };
  query?: AggregateQuery | Query;
  onAddFilter: DocViewFilterFn;
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
  query,
  onAddFilter,
}: SavedSearchEmbeddableComponentProps) {
  const discoverServices = useDiscoverServices();
  const [savedSearch, rows] = useBatchedPublishingSubjects(api.savedSearch$, api.rows$);

  const savedSearchProps: SavedSearchProps = useMemo(() => {
    return {
      title: savedSearch.title,
      searchTitle: savedSearch.title,
      description: savedSearch.description,
      searchDescription: savedSearch.description,
      savedSearchId: savedSearch.id,
      dataView: savedSearch.searchSource.getField('index'),
      columns: savedSearch.columns ?? [],
      sort: getSortForEmbeddable(savedSearch, savedSearch.sort, discoverServices.uiSettings),
      rowHeightState: savedSearch.rowHeight,
      headerRowHeightState: savedSearch.headerRowHeight,
      rowsPerPageState: savedSearch.rowsPerPage,
      sampleSizeState: savedSearch.sampleSize,
      onUpdateRowHeight: (rowHeight: number | undefined) => {
        api.savedSearch$.next({ ...savedSearch, rowHeight });
      },
      onUpdateHeaderRowHeight: (headerRowHeight: number | undefined) => {
        api.savedSearch$.next({ ...savedSearch, headerRowHeight });
      },
      onUpdateRowsPerPage: (rowsPerPage: number | undefined) => {
        api.savedSearch$.next({ ...savedSearch, rowsPerPage });
      },
      onUpdateSampleSize: (sampleSize: number | undefined) => {
        api.savedSearch$.next({ ...savedSearch, sampleSize });
      },
      onSetColumns: (updatedColumns: string[]) => {
        api.savedSearch$.next({ ...savedSearch, columns: updatedColumns });
      },
      onSort: (nextSort: string[][]) => {
        const sortOrderArr: SortOrder[] = [];
        nextSort.forEach((arr) => {
          sortOrderArr.push(arr as SortOrder);
        });
        api.savedSearch$.next({ ...savedSearch, sort: sortOrderArr });
      },
    };
  }, [api.savedSearch$, savedSearch, discoverServices]);

  const isTextBasedQueryMode = useMemo(
    () => isTextBasedQuery(savedSearch.searchSource.getField('query')),
    [savedSearch]
  );

  const useLegacyTable = useMemo(
    () =>
      isLegacyTableEnabled({
        uiSettings: discoverServices.uiSettings,
        isTextBasedQueryMode,
      }),
    [discoverServices, isTextBasedQueryMode]
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
      useNewFieldsApi: !discoverServices.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false),
      showTimeCol: !discoverServices.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
      ariaLabelledBy: 'documentsAriaLabel',
      cellActionsTriggerId: SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID,
    };
  }, [savedSearchProps, rows, onAddFilter, discoverServices]);

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
        isPlainRecord={isTextBasedQueryMode}
      />
    );
  }

  return (
    <DiscoverGridEmbeddableMemoized
      {...searchProps}
      sampleSizeState={fetchedSampleSize}
      loadingState={searchProps.isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
      query={query}
    />
  );
}
