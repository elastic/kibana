/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import type { DataView } from '@kbn/data-views-plugin/common';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import {
  FetchContext,
  useBatchedOptionalPublishingSubjects,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { SortOrder } from '@kbn/saved-search-plugin/public';
import { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';
import { DataGridDensity, DataLoadingState, useColumns } from '@kbn/unified-data-table';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getSortForEmbeddable } from '../../utils';
import { getAllowedSampleSize, getMaxAllowedSampleSize } from '../../utils/get_allowed_sample_size';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID } from '../constants';
import { isEsqlMode } from '../initialize_fetch';
import type { SearchEmbeddableApi, SearchEmbeddableStateManager } from '../types';
import { DiscoverGridEmbeddable } from './saved_search_grid';
import { getSearchEmbeddableDefaults } from '../get_search_embeddable_defaults';
import { onResizeGridColumn } from '../../utils/on_resize_grid_column';
import { DISCOVER_CELL_ACTIONS_TRIGGER, useAdditionalCellActions } from '../../context_awareness';
import { getTimeRangeFromFetchContext } from '../utils/update_search_source';
import { createDataSource } from '../../../common/data_sources';

interface SavedSearchEmbeddableComponentProps {
  api: SearchEmbeddableApi & {
    fetchWarnings$: BehaviorSubject<SearchResponseIncompleteWarning[]>;
    fetchContext$: BehaviorSubject<FetchContext | undefined>;
  };
  dataView: DataView;
  onAddFilter?: DocViewFilterFn;
  enableDocumentViewer: boolean;
  stateManager: SearchEmbeddableStateManager;
}

const DiscoverGridEmbeddableMemoized = React.memo(DiscoverGridEmbeddable);

export function SearchEmbeddableGridComponent({
  api,
  dataView,
  onAddFilter,
  enableDocumentViewer,
  stateManager,
}: SavedSearchEmbeddableComponentProps) {
  const discoverServices = useDiscoverServices();
  const [
    loading,
    savedSearch,
    savedSearchId,
    interceptedWarnings,
    apiQuery,
    apiFilters,
    fetchContext,
    rows,
    totalHitCount,
    columnsMeta,
    grid,
  ] = useBatchedPublishingSubjects(
    api.dataLoading,
    api.savedSearch$,
    api.savedObjectId,
    api.fetchWarnings$,
    api.query$,
    api.filters$,
    api.fetchContext$,
    stateManager.rows,
    stateManager.totalHitCount,
    stateManager.columnsMeta,
    stateManager.grid
  );

  // `api.query$` and `api.filters$` are the initial values from the saved search SO (as of now)
  // `fetchContext.query` and `fetchContext.filters` are Dashboard's query and filters

  const savedSearchQuery = apiQuery;
  const savedSearchFilters = apiFilters;

  const [panelTitle, panelDescription, savedSearchTitle, savedSearchDescription] =
    useBatchedOptionalPublishingSubjects(
      api.panelTitle,
      api.panelDescription,
      api.defaultPanelTitle,
      api.defaultPanelDescription
    );

  const isEsql = useMemo(() => isEsqlMode(savedSearch), [savedSearch]);

  const sort = useMemo(() => {
    return getSortForEmbeddable(savedSearch.sort, dataView, discoverServices.uiSettings, isEsql);
  }, [savedSearch.sort, dataView, isEsql, discoverServices.uiSettings]);

  const originalColumns = useMemo(() => savedSearch.columns ?? [], [savedSearch.columns]);
  const useNewFieldsApi = !discoverServices.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false);

  const { columns, onAddColumn, onRemoveColumn, onMoveColumn, onSetColumns } = useColumns({
    capabilities: discoverServices.capabilities,
    defaultOrder: discoverServices.uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews: discoverServices.dataViews,
    setAppState: (params) => {
      if (params.columns) {
        stateManager.columns.next(params.columns);
      }
      if (params.sort) {
        stateManager.sort.next(params.sort as SortOrder[]);
      }
      if (params.settings) {
        stateManager.grid.next(params.settings as DiscoverGridSettings);
      }
    },
    useNewFieldsApi,
    columns: originalColumns,
    sort,
    settings: grid,
  });

  const dataSource = useMemo(
    () => createDataSource({ dataView, query: savedSearchQuery }),
    [dataView, savedSearchQuery]
  );
  const timeRange = useMemo(
    () => (fetchContext ? getTimeRangeFromFetchContext(fetchContext) : undefined),
    [fetchContext]
  );

  const cellActionsMetadata = useAdditionalCellActions({
    dataSource,
    dataView,
    query: savedSearchQuery,
    filters: savedSearchFilters,
    timeRange,
  });

  // Security Solution overrides our cell actions -- this is a temporary workaroud to keep
  // things working as they do currently until we can migrate their actions to One Discover
  const isInSecuritySolution =
    useObservable(discoverServices.application.currentAppId$) === 'securitySolutionUI';

  const onStateEditedProps = useMemo(
    () => ({
      onAddColumn,
      onSetColumns,
      onMoveColumn,
      onRemoveColumn,
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
      onUpdateDataGridDensity: (newDensity: DataGridDensity | undefined) => {
        stateManager.density.next(newDensity);
      },
      onResize: (newGridSettings: { columnId: string; width: number | undefined }) => {
        stateManager.grid.next(onResizeGridColumn(newGridSettings, grid));
      },
    }),
    [
      onAddColumn,
      onSetColumns,
      onMoveColumn,
      onRemoveColumn,
      stateManager.rowsPerPage,
      stateManager.rowHeight,
      stateManager.headerRowHeight,
      stateManager.sort,
      stateManager.sampleSize,
      stateManager.density,
      stateManager.grid,
      grid,
    ]
  );

  const fetchedSampleSize = useMemo(() => {
    return getAllowedSampleSize(savedSearch.sampleSize, discoverServices.uiSettings);
  }, [savedSearch.sampleSize, discoverServices]);

  const defaults = getSearchEmbeddableDefaults(discoverServices.uiSettings);

  const sharedProps = {
    columns,
    dataView,
    interceptedWarnings,
    onFilter: onAddFilter,
    rows,
    rowsPerPageState: savedSearch.rowsPerPage ?? defaults.rowsPerPage,
    sampleSizeState: fetchedSampleSize,
    searchDescription: panelDescription || savedSearchDescription,
    sort,
    totalHitCount,
    useNewFieldsApi,
  };

  return (
    <DiscoverGridEmbeddableMemoized
      {...sharedProps}
      {...onStateEditedProps}
      settings={savedSearch.grid}
      ariaLabelledBy={'documentsAriaLabel'}
      cellActionsTriggerId={
        isInSecuritySolution
          ? SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID
          : DISCOVER_CELL_ACTIONS_TRIGGER.id
      }
      cellActionsMetadata={isInSecuritySolution ? undefined : cellActionsMetadata}
      cellActionsHandling={isInSecuritySolution ? 'replace' : 'append'}
      columnsMeta={columnsMeta}
      configHeaderRowHeight={defaults.headerRowHeight}
      configRowHeight={defaults.rowHeight}
      headerRowHeightState={savedSearch.headerRowHeight}
      rowHeightState={savedSearch.rowHeight}
      isPlainRecord={isEsql}
      loadingState={Boolean(loading) ? DataLoadingState.loading : DataLoadingState.loaded}
      maxAllowedSampleSize={getMaxAllowedSampleSize(discoverServices.uiSettings)}
      query={savedSearchQuery}
      filters={savedSearchFilters}
      savedSearchId={savedSearchId}
      searchTitle={panelTitle || savedSearchTitle}
      services={discoverServices}
      showTimeCol={!discoverServices.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false)}
      dataGridDensityState={savedSearch.density}
      enableDocumentViewer={enableDocumentViewer}
    />
  );
}
