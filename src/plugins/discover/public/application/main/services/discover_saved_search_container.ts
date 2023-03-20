/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedSearch, SavedSearch, saveSavedSearch } from '@kbn/saved-search-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import { isEqual } from 'lodash';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';
import { updateSavedSearch } from '../utils/update_saved_search';
import { addLog } from '../../../utils/add_log';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import { DiscoverAppState } from './discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { getStateDefaults } from '../utils/get_state_defaults';

export interface UpdateParams {
  nextDataView?: DataView | undefined;
  nextState?: DiscoverAppState | undefined;
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
   * @param dataView
   */
  load: (id: string, dataView?: DataView) => Promise<SavedSearch>;
  /**
   * Initialize a new saved search
   * Resets the initial and current state of the saved search
   * @param dataView
   */
  new: (dataView?: DataView) => Promise<SavedSearch>;
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
    savedSearchCurrent$.next(newSavedSearch);
    // due to the stateful nature of searchSource it has to be copied to allow independent state transitions
    const persistedSavedSearch = {
      ...newSavedSearch,
      ...{ searchSource: newSavedSearch.searchSource.createCopy() },
    };
    savedSearchInitial$.next(persistedSavedSearch);
    return newSavedSearch;
  };
  const get = () => savedSearchCurrent$.getValue();
  const getInitial$ = () => savedSearchInitial$;
  const getCurrent$ = () => savedSearchCurrent$;
  const getHasChanged$ = () => hasChanged$;
  const getTitle = () => savedSearchCurrent$.getValue().title ?? '';
  const getId = () => savedSearchCurrent$.getValue().id;

  const newSavedSearch = async (nextDataView: DataView | undefined) => {
    addLog('[savedSearch] new', { nextDataView });
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
    return set(nextSavedSearchToSet);
  };

  const persist = async (nextSavedSearch: SavedSearch, saveOptions?: SavedObjectSaveOpts) => {
    addLog('[savedSearch] persist', { nextSavedSearch, saveOptions });

    const id = await saveSavedSearch(
      nextSavedSearch,
      saveOptions || {},
      services.core.savedObjects.client,
      services.savedObjectsTagging
    );

    if (id) {
      set(nextSavedSearch);
    }
    return { id };
  };
  const update = ({ nextDataView, nextState, filterAndQuery }: UpdateParams) => {
    addLog('[savedSearch] update', { nextDataView, nextState });

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

    const hasChanged = !isEqualSavedSearch(savedSearchInitial$.getValue(), nextSavedSearch);
    hasChanged$.next(hasChanged);
    savedSearchCurrent$.next(nextSavedSearch);

    addLog('[savedSearch] update done', nextSavedSearch);
    return nextSavedSearch;
  };

  const load = async (id: string, dataView: DataView | undefined): Promise<SavedSearch> => {
    const loadedSavedSearch = await getSavedSearch(id, {
      search: services.data.search,
      savedObjectsClient: services.core.savedObjects.client,
      spaces: services.spaces,
      savedObjectsTagging: services.savedObjectsTagging,
    });
    if (!loadedSavedSearch.searchSource.getField('index') && dataView) {
      loadedSavedSearch.searchSource.setField('index', dataView);
    }
    restoreStateFromSavedSearch({
      savedSearch: loadedSavedSearch,
      timefilter: services.timefilter,
    });
    return set(loadedSavedSearch);
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

  const keys = new Set([
    ...Object.keys(prevSavedSearch),
    ...Object.keys(nextSavedSearchWithoutSearchSource),
  ]);
  const savedSearchDiff = [...keys].filter((key: string) => {
    // @ts-expect-error
    return !isEqual(prevSavedSearch[key], nextSavedSearchWithoutSearchSource[key]);
  });

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
