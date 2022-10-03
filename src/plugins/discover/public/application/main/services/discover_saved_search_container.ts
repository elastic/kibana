/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedSearch, SavedSearch } from '@kbn/saved-search-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import { isEqual } from 'lodash';
import { AppState } from './discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';
import { persistSavedSearch, updateSavedSearch } from '../utils/persist_saved_search';

export interface SavedSearchContainer {
  savedSearch$: BehaviorSubject<SavedSearch>;
  savedSearchPersisted$: BehaviorSubject<SavedSearch>;
  hasChanged$: BehaviorSubject<boolean>;
  set: (savedSearch: SavedSearch) => void;
  get: () => SavedSearch;
  update: (nextDataView: DataView, nextState: AppState) => SavedSearch;
  reset: (id: string | undefined) => Promise<SavedSearch>;
  hasChanged: () => boolean;
  isPersisted: () => boolean;
  persist: (
    nextSavedSearch: SavedSearch,
    {
      onError,
      onSuccess,
      saveOptions,
      state,
    }: {
      onError: (error: Error, savedSearch: SavedSearch) => void;
      onSuccess: (id: string) => void;
      saveOptions: SavedObjectSaveOpts;
      state: AppState;
    }
  ) => Promise<any>;
}

export function getSavedSearchContainer({
  savedSearch,
  services,
}: {
  savedSearch: SavedSearch;
  services: DiscoverServices;
}): SavedSearchContainer {
  const savedSearchPersisted$ = new BehaviorSubject(savedSearch);
  const savedSearch$ = new BehaviorSubject(savedSearch);
  const hasChanged$ = new BehaviorSubject(false);
  const set = (newSavedSearch: SavedSearch) => {
    hasChanged$.next(false);
    savedSearch$.next(newSavedSearch);
    savedSearchPersisted$.next(newSavedSearch);
  };
  const get = () => {
    return savedSearch$.getValue();
  };
  const reset = async (id: string | undefined) => {
    // any undefined if means it's a new saved search generated
    const newSavedSearch = await getSavedSearch(id, {
      search: services.data.search,
      savedObjectsClient: services.core.savedObjects.client,
      spaces: services.spaces,
      savedObjectsTagging: services.savedObjectsTagging,
    });

    restoreStateFromSavedSearch({
      savedSearch: newSavedSearch,
      timefilter: services.timefilter,
    });

    set(newSavedSearch);
    return newSavedSearch;
  };
  const persist = (
    nextSavedSearch: SavedSearch,
    {
      onError,
      onSuccess,
      saveOptions,
      state,
    }: {
      onError: (error: Error, savedSearch: SavedSearch) => void;
      onSuccess: (id: string) => void;
      saveOptions: SavedObjectSaveOpts;
      state: AppState;
    }
  ) => {
    return persistSavedSearch(nextSavedSearch, {
      dataView: nextSavedSearch.searchSource.getField('index')!,
      onError,
      onSuccess: (id) => {
        savedSearchPersisted$.next(nextSavedSearch);
        onSuccess(id);
      },
      state,
      services,
      saveOptions,
    });
  };

  const hasChanged = () => {
    return !isEqual(savedSearch, savedSearch$.getValue());
  };
  const isPersisted = () => Boolean(savedSearch$.getValue().id);
  const update = (nextDataView: DataView, nextState: AppState) => {
    const nextSavedSearch = updateSavedSearch({
      savedSearch: { ...get() },
      dataView: nextDataView,
      state: nextState,
      services,
    });
    savedSearch$.next(nextSavedSearch);
    hasChanged$.next(true);

    return nextSavedSearch;
  };

  return {
    savedSearch$,
    savedSearchPersisted$,
    hasChanged$,
    set,
    reset,
    hasChanged,
    persist,
    isPersisted,
    get,
    update,
  };
}
