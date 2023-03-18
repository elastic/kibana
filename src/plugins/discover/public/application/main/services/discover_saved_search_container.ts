/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedSearch, SavedSearch } from '@kbn/saved-search-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import { differenceWith, isEqual, toPairs } from 'lodash';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { loadSavedSearch } from '../utils/load_saved_search';
import { updateSavedSearch } from '../utils/update_saved_search';
import { addLog } from '../../../utils/add_log';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import { DiscoverAppState } from './discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { persistSavedSearch } from '../utils/persist_saved_search';
import { getStateDefaults } from '../utils/get_state_defaults';

export interface LoadParams {
  dataViewSpec?: DataViewSpec;
  dataViewList: DataViewListItem[];
  appState?: DiscoverAppState;
}

export interface UpdateParams {
  nextDataView: DataView | undefined;
  nextState: DiscoverAppState | undefined;
  resetSavedSearch?: boolean;
  filterAndQuery?: boolean;
}

/**
 * Container for the saved search state, allowing to load, update and persist the saved search
 * Can also be used to track changes to the saved search
 */
export interface DiscoverSavedSearchContainer {
  /**
   * Get the current state of the saved search
   */
  get: () => SavedSearch;
  /**
   * Get the id of the current saved search
   */
  getId: () => string | undefined;
  /**
   * Get the title of the current saved search
   */
  getTitle: () => string;
  /**
   * Get an BehaviorSubject which contains the initial state of the current saved search
   */
  getInitial$: () => BehaviorSubject<SavedSearch>;
  /**
   * Get an BehaviorSubject which contains the current state of the current saved search
   */
  getCurrent$: () => BehaviorSubject<SavedSearch>;
  /**
   * Get an BehaviorSubject containing the state if there have been changes to the initial state of the saved search
   */
  getHasChanged$: () => BehaviorSubject<boolean>;
  /**
   * Load a saved search by the given id
   * Resets the initial and current state of the saved search
   * @param id
   * @param params
   */
  load: (id: string, params: LoadParams) => Promise<SavedSearch>;
  /**
   * Initialize a new saved search
   * Resets the initial and current state of the saved search
   * @param dataView
   * @param appState
   */
  new: (dataView?: DataView, appState?: DiscoverAppState) => Promise<SavedSearch>;
  /**
   * Persist the given saved search
   * Resets the initial and current state of the saved search
   */
  persist: (
    savedSearch: SavedSearch,
    saveOptions?: SavedObjectSaveOpts
  ) => Promise<{ id: string | undefined } | undefined>;
  /**
   * Set the persisted & current state of the saved search
   * Happens when a saved search is loaded or a new one is created
   * @param savedSearch
   */
  set: (savedSearch: SavedSearch) => SavedSearch;
  /**
   * Updates the current state of the saved search
   * @param params
   */
  update: (params: UpdateParams) => SavedSearch;
}

export function getSavedSearchContainer({
  savedSearch,
  services,
}: {
  savedSearch: SavedSearch;
  services: DiscoverServices;
}): DiscoverSavedSearchContainer {
  const savedSearchInitial$ = new BehaviorSubject(savedSearch);
  const savedSearchCurrent$ = new BehaviorSubject(savedSearch);
  const hasChanged$ = new BehaviorSubject(false);
  const set = (newSavedSearch: SavedSearch) => {
    addLog('[savedSearch] set', newSavedSearch);
    hasChanged$.next(false);
    // due to the stateful nature of searchSource it has to be copied to allow independent state transitions
    const persistedSavedSearch = {
      ...newSavedSearch,
      ...{ searchSource: newSavedSearch.searchSource.createCopy() },
    };
    savedSearchInitial$.next(persistedSavedSearch);
    savedSearchInitial$.next(newSavedSearch);
    return newSavedSearch;
  };
  const get = () => savedSearchCurrent$.getValue();
  const getInitial$ = () => savedSearchInitial$;
  const getCurrent$ = () => savedSearchCurrent$;
  const getHasChanged$ = () => hasChanged$;
  const getTitle = () => savedSearchCurrent$.getValue().title ?? '';
  const getId = () => savedSearchCurrent$.getValue().id;

  const newSavedSearch = async (
    nextDataView: DataView | undefined,
    appState?: DiscoverAppState
  ) => {
    addLog('[savedSearch] new', { nextDataView, appState });
    const dataView = nextDataView ?? get().searchSource.getField('index');
    const nextSavedSearch = await getSavedSearch('', {
      search: services.data.search,
      savedObjectsClient: services.core.savedObjects.client,
      spaces: services.spaces,
      savedObjectsTagging: services.savedObjectsTagging,
    });
    nextSavedSearch.searchSource.setField('index', dataView);
    const newAppState = getDefaultAppState(nextSavedSearch, services);
    const actualDataView = dataView ? dataView : nextSavedSearch.searchSource.getField('index')!;
    const nextSavedSearchToSet = updateSavedSearch(
      {
        savedSearch: { ...nextSavedSearch },
        dataView: actualDataView,
        state: newAppState,
        services,
      },
      true
    );
    set(nextSavedSearchToSet);
    if (appState) {
      return update({
        nextDataView: actualDataView,
        nextState: appState,
      });
    } else {
      return nextSavedSearchToSet;
    }
  };

  const persist = async (nextSavedSearch: SavedSearch, saveOptions?: SavedObjectSaveOpts) => {
    addLog('[savedSearch] persist', nextSavedSearch);

    const id = await persistSavedSearch(nextSavedSearch, {
      services,
      saveOptions,
    });
    if (id) {
      savedSearchInitial$.next(nextSavedSearch);
    }
    return { id };
  };
  const update = ({ nextDataView, nextState, resetSavedSearch, filterAndQuery }: UpdateParams) => {
    addLog('[savedSearch] update', { nextDataView, nextState, resetSavedSearch });

    const previousSavedSearch = get();
    const dataView = nextDataView
      ? nextDataView
      : previousSavedSearch.searchSource.getField('index')!;

    const nextSavedSearch = updateSavedSearch(
      {
        savedSearch: { ...previousSavedSearch },
        dataView,
        state: nextState || {},
        services,
      },
      !filterAndQuery
    );

    nextSavedSearch.searchSource.setField('index', dataView);
    if (nextState) {
      nextSavedSearch.searchSource
        .setField('query', nextState.query)
        .setField('filter', nextState.filters);
    }

    if (resetSavedSearch) {
      set(nextSavedSearch);
    } else {
      const hasChanged = !isEqualSavedSearch(savedSearchInitial$.getValue(), nextSavedSearch);

      hasChanged$.next(hasChanged);
      savedSearchCurrent$.next(nextSavedSearch);
    }
    addLog('[savedSearch] update done', nextSavedSearch);
    return nextSavedSearch;
  };

  const load = async (id: string, params: LoadParams): Promise<SavedSearch> => {
    const loadedSavedSearch = await loadSavedSearch(id, params.appState?.index, {
      services,
      dataViewList: params.dataViewList,
      dataViewSpec: params.dataViewSpec,
    });
    set(loadedSavedSearch);
    if (params.appState) {
      await update({
        nextDataView: get().searchSource.getField('index'),
        nextState: params.appState,
      });
    }
    return loadedSavedSearch;
  };

  return {
    get,
    getCurrent$,
    getHasChanged$,
    getId,
    getInitial$,
    getTitle,
    load,
    new: newSavedSearch,
    persist,
    set,
    update,
  };
}

export function getDefaultAppState(savedSearch: SavedSearch, services: DiscoverServices) {
  return handleSourceColumnState(
    getStateDefaults({
      savedSearch,
      services,
    }),
    services.uiSettings
  );
}

export function isEqualSavedSearch(savedSearchPrev: SavedSearch, savedSearchNext: SavedSearch) {
  const { searchSource: prevSearchSource, ...prevSavedSearch } = savedSearchPrev;
  const { searchSource: nextSearchSource, ...nextSavedSearchWithoutSearchSource } = savedSearchNext;

  const savedSearchDiff = differenceWith(
    toPairs(prevSavedSearch),
    toPairs(nextSavedSearchWithoutSearchSource),
    isEqual
  );

  const searchSourceDiff =
    !isEqual(prevSearchSource.getField('filter'), nextSearchSource.getField('filter')) ||
    !isEqual(prevSearchSource.getField('query'), nextSearchSource.getField('query')) ||
    !isEqual(prevSearchSource.getField('index'), nextSearchSource.getField('index'));
  const hasChanged = Boolean(savedSearchDiff.length || searchSourceDiff);
  if (hasChanged) {
    addLog('[savedSearch] difference between initial and changed version', searchSourceDiff);
  }
  return !hasChanged;
}
