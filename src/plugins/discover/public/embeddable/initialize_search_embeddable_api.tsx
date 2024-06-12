/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'react-fast-compare';
import { BehaviorSubject, skip, switchMap } from 'rxjs';

import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { ROW_HEIGHT_OPTION, SAMPLE_SIZE_SETTING } from '@kbn/discover-utils';
import { DataTableRecord } from '@kbn/discover-utils/types';
import type { StateComparators } from '@kbn/presentation-publishing';
import { SavedSearch } from '@kbn/saved-search-plugin/common';
import { SortOrder, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { DataTableColumnsMeta } from '@kbn/unified-data-table';

import { getDefaultRowsPerPage } from '../../common/constants';
import { DiscoverServices } from '../build_services';
import { DEFAULT_HEADER_ROW_HEIGHT_LINES } from './constants';
import {
  PublishesSavedSearchAttributes,
  SearchEmbeddableAttributes,
  SearchEmbeddableRuntimeState,
} from './types';

export type SavedSearchAttributesManager = {
  [key in keyof Required<
    Omit<SearchEmbeddableAttributes, 'serializedSearchSource'>
  >]: BehaviorSubject<Omit<SearchEmbeddableAttributes, 'serializedSearchSource'>[key]>;
};

const initializeSearchSource = async (
  dataService: DiscoverServices['data'],
  serializedSearchSource?: SerializedSearchSourceFields
) => {
  const [searchSource, parentSearchSource] = await Promise.all([
    dataService.search.searchSource.create(serializedSearchSource),
    dataService.search.searchSource.create(),
  ]);
  searchSource.setParent(parentSearchSource);
  const dataView = searchSource.getField('index');
  return { searchSource, dataView };
};

export const initializeSearchEmbeddableApi = async (
  initialState: SearchEmbeddableRuntimeState,
  {
    discoverServices,
  }: {
    discoverServices: DiscoverServices;
  }
): Promise<{
  searchEmbeddableApi: PublishesSavedSearchAttributes;
  searchEmbeddableStateManager: SavedSearchAttributesManager;
  searchEmbeddableComparators: StateComparators<SearchEmbeddableAttributes>;
}> => {
  const serializedSearchSource$ = new BehaviorSubject(initialState.serializedSearchSource);
  /** We **must** have a search source, so start by initializing it  */
  const { searchSource, dataView } = await initializeSearchSource(
    discoverServices.data,
    initialState.serializedSearchSource
  );
  const searchSource$ = new BehaviorSubject(searchSource);
  const dataViews = new BehaviorSubject(dataView ? [dataView] : undefined);

  /** This is the state that can be initialized from the saved initial state */
  const managed$ = new BehaviorSubject(initialState.managed);
  const columns$ = new BehaviorSubject<string[] | undefined>(initialState.columns);
  const rowHeight$ = new BehaviorSubject<number | undefined>(initialState.rowHeight);
  const rowsPerPage$ = new BehaviorSubject<number | undefined>(initialState.rowsPerPage);
  const headerRowHeight$ = new BehaviorSubject<number | undefined>(initialState.headerRowHeight);
  const sort$ = new BehaviorSubject<SortOrder[] | undefined>(initialState.sort);
  const sampleSize$ = new BehaviorSubject<number | undefined>(initialState.sampleSize);
  const breakdownField$ = new BehaviorSubject<string | undefined>(initialState.breakdownField);
  const savedSearchViewMode$ = new BehaviorSubject<VIEW_MODE | undefined>(initialState.viewMode);

  /** This is the state that has to be fetched */
  const rows$ = new BehaviorSubject<DataTableRecord[]>([]);
  const columnsMeta$ = new BehaviorSubject<DataTableColumnsMeta | undefined>(undefined);
  const totalHitCount$ = new BehaviorSubject<number | undefined>(undefined);

  const stateManager: SavedSearchAttributesManager = {
    columns: columns$,
    rowHeight: rowHeight$,
    rowsPerPage: rowsPerPage$,
    headerRowHeight: headerRowHeight$,
    sort: sort$,
    sampleSize: sampleSize$,
    breakdownField: breakdownField$,
    viewMode: savedSearchViewMode$,
    managed: managed$,
  };

  const defaultRowHeight = discoverServices.uiSettings.get(ROW_HEIGHT_OPTION);
  const defaultRowsPerPage = getDefaultRowsPerPage(discoverServices.uiSettings);
  const defaultSampleSize = discoverServices.uiSettings.get(SAMPLE_SIZE_SETTING);

  /** Keep the search source in sync with the runtime state serialized search source */
  const cleanup = serializedSearchSource$
    .pipe(
      skip(1), // skip the first emit because it was initialized above
      switchMap((serializedSearchSource) =>
        initializeSearchSource(discoverServices.data, serializedSearchSource)
      )
    )
    .subscribe(({ searchSource: newSearchSource, dataView: newDataView }) => {
      searchSource$.next(newSearchSource);
      dataViews.next(newDataView ? [newDataView] : undefined);
    });

  const getSearchEmbeddableComparators = (): StateComparators<SearchEmbeddableAttributes> => {
    return {
      managed: [managed$, (value) => managed$.next(value)],
      serializedSearchSource: [
        serializedSearchSource$,
        (value) => serializedSearchSource$.next(value),
      ],
      breakdownField: [breakdownField$, (value) => breakdownField$.next(value)],
      viewMode: [savedSearchViewMode$, (value) => savedSearchViewMode$.next(value)],
      sort: [sort$, (value) => sort$.next(value), (a, b) => deepEqual(a, b)],
      columns: [columns$, (value) => columns$.next(value), (a, b) => deepEqual(a, b)],
      sampleSize: [
        sampleSize$,
        (value) => sampleSize$.next(value),
        (a, b) => (a ?? defaultSampleSize) === (b ?? defaultSampleSize),
      ],
      rowsPerPage: [
        rowsPerPage$,
        (value) => rowsPerPage$.next(value),
        (a, b) => (a ?? defaultRowsPerPage) === (b ?? defaultRowsPerPage),
      ],
      rowHeight: [
        rowHeight$,
        (value) => rowHeight$.next(value),
        (a, b) => (a ?? defaultRowHeight) === (b ?? defaultRowHeight),
      ],
      headerRowHeight: [
        headerRowHeight$,
        (value) => headerRowHeight$.next(value),
        (a, b) => (a ?? DEFAULT_HEADER_ROW_HEIGHT_LINES) === (b ?? DEFAULT_HEADER_ROW_HEIGHT_LINES),
      ],
    };
  };

  return {
    searchEmbeddableApi: {
      rows$,
      columns$,
      columnsMeta$,
      totalHitCount$,
      sort$,
      searchSource$,
      sampleSize$,
      dataViews,
      rowHeight$,
      headerRowHeight$,
      rowsPerPage$,
      savedSearchViewMode$,
      getSavedSearch: (): SavedSearch => {
        return {
          ...Object.keys(stateManager).reduce((prev, key) => {
            return {
              ...prev,
              [key]: stateManager[key as keyof SavedSearchAttributesManager].getValue(),
            };
          }, {} as SavedSearch),
          searchSource: searchSource$.getValue(),
        };
      },
    },
    searchEmbeddableStateManager: stateManager,
    searchEmbeddableComparators: getSearchEmbeddableComparators(),
  };
};
