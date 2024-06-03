/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'react-fast-compare';
import { BehaviorSubject } from 'rxjs';

import { DataTableRecord } from '@kbn/discover-utils/types';
import type { StateComparators } from '@kbn/presentation-publishing';
import { SavedSearch } from '@kbn/saved-search-plugin/common';
import { SortOrder, VIEW_MODE } from '@kbn/saved-search-plugin/public';

import { DiscoverServices } from '../build_services';
import {
  DEFAULT_HEADER_ROW_HEIGHT_LINES,
  DEFAULT_ROWS_PER_PAGE,
  DEFAULT_ROW_HEIGHT_LINES,
  DEFAULT_SAMPLE_SIZE,
} from './constants';
import {
  PublishesSavedSearchAttributes,
  SearchEmbeddableAttributes,
  SearchEmbeddableRuntimeState,
} from './types';

export type SavedSearchAttributesManager = {
  [key in keyof Required<SearchEmbeddableAttributes>]: BehaviorSubject<
    SearchEmbeddableAttributes[key]
  >;
};

export const initializeSearchEmbeddableApi = async (
  initialState: SearchEmbeddableRuntimeState,
  {
    startServices,
    discoverServices,
  }: {
    startServices: {
      executeTriggerActions: (triggerId: string, context: object) => Promise<void>;
      // isEditable: () => boolean;
    };
    discoverServices: DiscoverServices;
  }
): Promise<{
  searchEmbeddableApi: PublishesSavedSearchAttributes;
  searchEmbeddableStateManager: SavedSearchAttributesManager;
  searchEmbeddableComparators: StateComparators<SearchEmbeddableAttributes>;
}> => {
  const parentSearchSource = await discoverServices.data.search.searchSource.create();
  initialState.searchSource.setParent(parentSearchSource);
  const dataView = initialState.searchSource.getField('index');

  const searchSource$ = new BehaviorSubject(initialState.searchSource);
  const managed$ = new BehaviorSubject(initialState.managed);
  const dataViews = new BehaviorSubject(dataView ? [dataView] : undefined);
  const rows$ = new BehaviorSubject<DataTableRecord[]>([]);
  const columns$ = new BehaviorSubject<string[] | undefined>(initialState.columns);
  const rowHeight$ = new BehaviorSubject<number | undefined>(initialState.rowHeight);
  const rowsPerPage$ = new BehaviorSubject<number | undefined>(initialState.rowsPerPage);
  const headerRowHeight$ = new BehaviorSubject<number | undefined>(initialState.headerRowHeight);
  const sort$ = new BehaviorSubject<SortOrder[] | undefined>(initialState.sort);
  const sampleSize$ = new BehaviorSubject<number | undefined>(initialState.sampleSize);
  const breakdownField$ = new BehaviorSubject<string | undefined>(initialState.breakdownField);
  const savedSearchViewMode$ = new BehaviorSubject<VIEW_MODE | undefined>(initialState.viewMode);

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
    searchSource: searchSource$,
  };

  const getSearchEmbeddableComparators = (): StateComparators<SearchEmbeddableAttributes> => {
    return {
      managed: [managed$, (value) => managed$.next(value)],
      searchSource: [searchSource$, (value) => searchSource$.next(value)],
      breakdownField: [breakdownField$, (value) => breakdownField$.next(value)],
      viewMode: [savedSearchViewMode$, (value) => savedSearchViewMode$.next(value)],
      sort: [sort$, (value) => sort$.next(value), (a, b) => deepEqual(a, b)],
      columns: [columns$, (value) => columns$.next(value), (a, b) => deepEqual(a, b)],
      sampleSize: [
        sampleSize$,
        (value) => sampleSize$.next(value),
        (a, b) => (a ?? DEFAULT_SAMPLE_SIZE) === (b ?? DEFAULT_SAMPLE_SIZE),
      ],
      rowsPerPage: [
        rowsPerPage$,
        (value) => rowsPerPage$.next(value),
        (a, b) => (a ?? DEFAULT_ROWS_PER_PAGE) === (b ?? DEFAULT_ROWS_PER_PAGE),
      ],
      rowHeight: [
        rowHeight$,
        (value) => rowHeight$.next(value),
        (a, b) => (a ?? DEFAULT_ROW_HEIGHT_LINES) === (b ?? DEFAULT_ROW_HEIGHT_LINES),
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
      sort$,
      searchSource$,
      sampleSize$,
      dataViews,
      rowHeight$,
      headerRowHeight$,
      rowsPerPage$,
      savedSearchViewMode$,
      getSavedSearch: (): SavedSearch => {
        return Object.keys(stateManager).reduce((prev, key) => {
          return {
            ...prev,
            [key]: stateManager[key as keyof SavedSearchAttributesManager].getValue(),
          };
        }, {} as SavedSearch);
      },
    },
    searchEmbeddableStateManager: stateManager,
    searchEmbeddableComparators: getSearchEmbeddableComparators(),
  };
};
