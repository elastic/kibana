/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { DataTableRecord } from '@kbn/discover-utils/types';
import { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import { DataLoadingState } from '@kbn/unified-data-table';

import { DOC_HIDE_TIME_COLUMN_SETTING, SEARCH_FIELDS_FROM_SOURCE } from '@kbn/discover-utils';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { BehaviorSubject } from 'rxjs';
import { isTextBasedQuery } from '../../application/main/utils/is_text_based_query';
import { DiscoverDocTableEmbeddable } from '../../components/doc_table/create_doc_table_embeddable';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getSortForEmbeddable } from '../../utils';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID } from '../constants';
import { DiscoverGridEmbeddable } from '../saved_search_grid';
import type { EmbeddableComponentSearchProps, SearchEmbeddableApi } from '../types';
import { getAllowedSampleSize } from '../../utils/get_allowed_sample_size';

interface SavedSearchEmbeddableComponentProps {
  useLegacyTable: boolean;
  query?: AggregateQuery | Query;

  onAddFilter: DocViewFilterFn;
  api: SearchEmbeddableApi & {
    savedSearch$: BehaviorSubject<SavedSearch>;
    rows$: BehaviorSubject<DataTableRecord[]>;
  };
}

const DiscoverDocTableEmbeddableMemoized = React.memo(DiscoverDocTableEmbeddable);
const DiscoverGridEmbeddableMemoized = React.memo(DiscoverGridEmbeddable);

export function SearchEmbeddableGridComponent({
  useLegacyTable,
  query,
  api,
  onAddFilter,
}: SavedSearchEmbeddableComponentProps) {
  const discoverServices = useDiscoverServices();
  const [savedSearch, rows] = useBatchedPublishingSubjects(api.savedSearch$, api.rows$);
  console.log('rows', rows);

  const savedSearchProps = useMemo(() => {
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
    const isPlainRecord = isTextBasedQuery(query);

    return (
      <DiscoverDocTableEmbeddableMemoized
        {...searchProps}
        sampleSizeState={fetchedSampleSize}
        isPlainRecord={isPlainRecord}
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
