/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedSearch, SavedSearch } from '@kbn/saved-search-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import { isEqual } from 'lodash';
import { DiscoverServices } from '../../../build_services';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';
import { persistSavedSearch } from '../utils/persist_saved_search';
import { AppState } from './discover_state';

export interface SavedSearchContainer {
  savedSearch$: BehaviorSubject<SavedSearch>;
  set: (savedSearch: SavedSearch) => void;
  reset: (id: string | undefined) => Promise<SavedSearch>;
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
  const savedSearch$ = new BehaviorSubject(savedSearch);
  const set = (newSavedSearch: SavedSearch) => {
    savedSearch$.next(newSavedSearch);
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

    savedSearch$.next(newSavedSearch);
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
      onSuccess,
      state,
      services,
      saveOptions,
    });
  };

  const hasChanged = () => {
    return !isEqual(savedSearch, savedSearch$.getValue());
  };
  const isPersisted = () => savedSearch$.getValue().id;

  return {
    savedSearch$,
    set,
    reset,
    hasChanged,
    persist,
    isPersisted,
  };
}
