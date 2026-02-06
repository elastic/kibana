/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import deepEqual from 'react-fast-compare';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, map, merge, skip } from 'rxjs';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { ISearchSource, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type {
  PublishesWritableUnifiedSearch,
  PublishesWritableDataViews,
  StateComparators,
  ProjectRoutingOverrides,
  PublishesProjectRoutingOverrides,
} from '@kbn/presentation-publishing';
import type {
  DiscoverGridSettings,
  DiscoverSessionTab,
  SavedSearch,
} from '@kbn/saved-search-plugin/common';
import type { SortOrder, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import type { DataGridDensity, DataTableColumnsMeta } from '@kbn/unified-data-table';

import {
  isOfAggregateQueryType,
  type AggregateQuery,
  type Filter,
  type Query,
} from '@kbn/es-query';
import { getProjectRoutingFromEsqlQuery } from '@kbn/esql-utils';
import type { DiscoverServices } from '../build_services';
import { EDITABLE_SAVED_SEARCH_KEYS } from '../../common/embeddable/constants';
import { getSearchEmbeddableDefaults } from './get_search_embeddable_defaults';
import type {
  PublishesWritableSavedSearch,
  SearchEmbeddableRuntimeState,
  SearchEmbeddableSerializedAttributes,
  SearchEmbeddableStateManager,
} from './types';
import { getEsqlDataView } from '../application/main/state_management/utils/get_esql_data_view';

const initializeSearchSource = async (
  discoverServices: DiscoverServices,
  serializedSearchSource?: SerializedSearchSourceFields
) => {
  const [searchSource, parentSearchSource] = await Promise.all([
    discoverServices.data.search.searchSource.create(serializedSearchSource),
    discoverServices.data.search.searchSource.create(),
  ]);

  searchSource.setParent(parentSearchSource);

  const query = searchSource.getField('query');
  let dataView = searchSource.getField('index');

  if (isOfAggregateQueryType(query)) {
    dataView = await getEsqlDataView(query, dataView, discoverServices);
  }

  return { searchSource, dataView };
};

// Keys that are not part of SavedSearch and should be excluded when building it
const NON_SAVED_SEARCH_KEYS: Array<keyof SearchEmbeddableStateManager> = [
  'selectedTabId',
  'selectedTabNotFound',
  'tabs',
];

const initializedSavedSearch = (
  stateManager: SearchEmbeddableStateManager,
  searchSource: ISearchSource,
  discoverServices: DiscoverServices
): SavedSearch => {
  return {
    ...Object.keys(stateManager).reduce((prev, key) => {
      // Exclude keys that are not part of SavedSearch
      if (NON_SAVED_SEARCH_KEYS.includes(key as keyof SearchEmbeddableStateManager)) {
        return prev;
      }
      return {
        ...prev,
        [key]: stateManager[key as keyof SearchEmbeddableStateManager].getValue(),
      };
    }, discoverServices.savedSearch.getNew()),
    searchSource,
  };
};

const getProjectRoutingOverrides = (query: Query | AggregateQuery | undefined) => {
  if (isOfAggregateQueryType(query)) {
    const value = getProjectRoutingFromEsqlQuery(query.esql);
    return value ? [{ value }] : undefined;
  }
};

export const initializeSearchEmbeddableApi = async (
  initialState: SearchEmbeddableRuntimeState,
  {
    discoverServices,
  }: {
    discoverServices: DiscoverServices;
  }
): Promise<{
  api: PublishesWritableSavedSearch &
    PublishesWritableDataViews &
    Partial<PublishesWritableUnifiedSearch> &
    PublishesProjectRoutingOverrides;
  stateManager: SearchEmbeddableStateManager;
  anyStateChange$: Observable<void>;
  comparators: StateComparators<SearchEmbeddableSerializedAttributes>;
  cleanup: () => void;
  reinitializeState: (lastSaved?: SearchEmbeddableRuntimeState) => void;
}> => {
  /** We **must** have a search source, so start by initializing it  */
  const { searchSource, dataView } = await initializeSearchSource(
    discoverServices,
    initialState.serializedSearchSource
  );
  const searchSource$ = new BehaviorSubject<ISearchSource>(searchSource);
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(dataView ? [dataView] : undefined);

  const defaults = getSearchEmbeddableDefaults(discoverServices.uiSettings);

  /** This is the state that can be initialized from the saved initial state */
  const columns$ = new BehaviorSubject<string[] | undefined>(initialState.columns);
  const grid$ = new BehaviorSubject<DiscoverGridSettings | undefined>(initialState.grid);
  const headerRowHeight$ = new BehaviorSubject<number | undefined>(initialState.headerRowHeight);
  const rowHeight$ = new BehaviorSubject<number | undefined>(initialState.rowHeight);
  const rowsPerPage$ = new BehaviorSubject<number | undefined>(initialState.rowsPerPage);
  const sampleSize$ = new BehaviorSubject<number | undefined>(initialState.sampleSize);
  const density$ = new BehaviorSubject<DataGridDensity | undefined>(initialState.density);
  const sort$ = new BehaviorSubject<SortOrder[] | undefined>(initialState.sort);
  const savedSearchViewMode$ = new BehaviorSubject<VIEW_MODE | undefined>(initialState.viewMode);
  const selectedTabId$ = new BehaviorSubject<string | undefined>(initialState?.selectedTabId);
  const selectedTabNotFound$ = new BehaviorSubject<boolean>(
    initialState?.selectedTabNotFound ?? false
  );
  const tabs$ = new BehaviorSubject<DiscoverSessionTab[]>(initialState?.tabs ?? []);

  /**
   * This is the state that comes from the search source that needs individual publishing subjects for the API
   * - Note that these subjects can't currently be changed on their own, and therefore we do not need to keep
   *   them "in sync" with changes to the search source. This would change with inline editing.
   */
  const filters$ = new BehaviorSubject<Filter[] | undefined>(
    searchSource.getField('filter') as Filter[]
  );
  const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(
    searchSource.getField('query')
  );

  const initialQuery = searchSource.getField('query');
  const projectRoutingOverrides$ = new BehaviorSubject<ProjectRoutingOverrides>(
    getProjectRoutingOverrides(initialQuery)
  );

  const canEditUnifiedSearch = () => false;

  /** This is the state that has to be fetched */
  const rows$ = new BehaviorSubject<DataTableRecord[]>([]);
  const columnsMeta$ = new BehaviorSubject<DataTableColumnsMeta | undefined>(undefined);
  const totalHitCount$ = new BehaviorSubject<number | undefined>(undefined);
  const inspectorAdapters$ = new BehaviorSubject<Adapters>({});

  /**
   * The state manager is used to modify the state of the saved search - this should never be
   * treated as the source of truth
   */
  const stateManager: SearchEmbeddableStateManager = {
    columns: columns$,
    columnsMeta: columnsMeta$,
    grid: grid$,
    headerRowHeight: headerRowHeight$,
    rows: rows$,
    rowHeight: rowHeight$,
    rowsPerPage: rowsPerPage$,
    sampleSize: sampleSize$,
    sort: sort$,
    totalHitCount: totalHitCount$,
    viewMode: savedSearchViewMode$,
    density: density$,
    inspectorAdapters: inspectorAdapters$,
    selectedTabId: selectedTabId$,
    selectedTabNotFound: selectedTabNotFound$,
    tabs: tabs$,
  };

  /** The saved search should be the source of truth for all state  */
  const savedSearch$ = new BehaviorSubject(
    initializedSavedSearch(stateManager, searchSource, discoverServices)
  );

  /** This will fire when any of the **editable** state changes */
  const onAnyStateChange: Observable<Partial<SearchEmbeddableSerializedAttributes>> = combineLatest(
    pick(stateManager, EDITABLE_SAVED_SEARCH_KEYS)
  );

  /** APIs for updating search source properties */
  const setDataViews = (nextDataViews: DataView[]) => {
    searchSource.setField('index', nextDataViews[0]);
    dataViews$.next(nextDataViews);
    searchSource$.next(searchSource);
  };

  const setFilters = (filters: Filter[] | undefined) => {
    searchSource.setField('filter', filters);
    filters$.next(filters);
    searchSource$.next(searchSource);
  };

  const setQuery = (query: Query | AggregateQuery | undefined) => {
    searchSource.setField('query', query);
    query$.next(query);
    searchSource$.next(searchSource);
  };

  const setColumns = (columns: string[] | undefined) => {
    stateManager.columns.next(columns);
  };

  const setSelectedTabId = async (tabId: string) => {
    const tabs = tabs$.getValue();
    const tab = tabs.find((t) => t.id === tabId);

    if (!tab) return;
    const newRawAttrs = pick(tab, EDITABLE_SAVED_SEARCH_KEYS);
    newRawAttrs.sort = newRawAttrs.sort ?? [];
    newRawAttrs.columns = newRawAttrs.columns ?? [];
    newRawAttrs.grid = newRawAttrs.grid ?? {};
    initialState.rawSavedObjectAttributes = newRawAttrs;
    initialState.deletedTabOverrides = undefined;

    selectedTabId$.next(tabId);
    selectedTabNotFound$.next(false);

    const { searchSource: newSearchSource, dataView: newDataView } = await initializeSearchSource(
      discoverServices,
      tab.serializedSearchSource
    );

    newSearchSource.setParent(searchSource$.getValue().getParent());
    searchSource$.next(newSearchSource);

    if (newDataView) dataViews$.next([newDataView]);

    columns$.next(tab.columns);
    sort$.next(tab.sort);
    grid$.next(tab.grid);
    rowHeight$.next(tab.rowHeight);
    headerRowHeight$.next(tab.headerRowHeight);
    rowsPerPage$.next(tab.rowsPerPage);
    sampleSize$.next(tab.sampleSize);
    savedSearchViewMode$.next(tab.viewMode);
    density$.next(tab.density);

    const newQuery = newSearchSource.getField('query');
    const newFilters = newSearchSource.getField('filter') as Filter[];
    query$.next(newQuery);
    filters$.next(newFilters);
    projectRoutingOverrides$.next(getProjectRoutingOverrides(newQuery));
  };

  /** Keep the saved search in sync with any state changes */
  const syncSavedSearch = combineLatest([onAnyStateChange, searchSource$])
    .pipe(
      skip(1),
      map(([newState, newSearchSource]) => {
        return {
          ...savedSearch$.getValue(),
          ...newState,
          searchSource: newSearchSource,
        };
      })
    )
    .subscribe((newSavedSearch) => {
      savedSearch$.next(newSavedSearch);
    });

  /** Keep projectRoutingOverrides$ in sync with query$ changes */
  const syncProjectRoutingOverrides = query$.subscribe((query) => {
    const currentOverrides = projectRoutingOverrides$.getValue();
    const nextOverrides = getProjectRoutingOverrides(query);

    if (!deepEqual(currentOverrides, nextOverrides)) {
      projectRoutingOverrides$.next(nextOverrides);
    }
  });

  return {
    cleanup: () => {
      syncSavedSearch.unsubscribe();
      syncProjectRoutingOverrides.unsubscribe();
    },
    api: {
      setDataViews,
      dataViews$,
      savedSearch$,
      filters$,
      setFilters,
      query$,
      setQuery,
      projectRoutingOverrides$,
      canEditUnifiedSearch,
      setColumns,
      setSelectedTabId,
    },
    stateManager,
    anyStateChange$: merge(
      onAnyStateChange.pipe(map(() => undefined)),
      selectedTabId$.pipe(
        skip(1),
        map(() => undefined)
      )
    ),
    comparators: {
      sort: (a, b) => deepEqual(a ?? [], b ?? []),
      columns: 'deepEquality',
      grid: (a, b) => deepEqual(a ?? {}, b ?? {}),
      sampleSize: (a, b) => (a ?? defaults.sampleSize) === (b ?? defaults.sampleSize),
      rowsPerPage: (a, b) => (a ?? defaults.rowsPerPage) === (b ?? defaults.rowsPerPage),
      rowHeight: (a, b) => (a ?? defaults.rowHeight) === (b ?? defaults.rowHeight),
      headerRowHeight: (a, b) =>
        (a ?? defaults.headerRowHeight) === (b ?? defaults.headerRowHeight),
      serializedSearchSource: 'referenceEquality',
      viewMode: 'referenceEquality',
      density: 'referenceEquality',
    },
    reinitializeState: (lastSaved?: SearchEmbeddableRuntimeState) => {
      sort$.next(lastSaved?.sort);
      columns$.next(lastSaved?.columns);
      grid$.next(lastSaved?.grid);
      sampleSize$.next(lastSaved?.sampleSize);
      rowsPerPage$.next(lastSaved?.rowsPerPage);
      rowHeight$.next(lastSaved?.rowHeight);
      headerRowHeight$.next(lastSaved?.headerRowHeight);
      savedSearchViewMode$.next(lastSaved?.viewMode);
      density$.next(lastSaved?.density);
      selectedTabId$.next(lastSaved?.selectedTabId);
      selectedTabNotFound$.next(lastSaved?.selectedTabNotFound ?? false);
    },
  };
};
