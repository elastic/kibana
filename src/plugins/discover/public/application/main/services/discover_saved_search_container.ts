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
import { handleSourceColumnState } from '../../../utils/state_helpers';
import { AppState, AppStateContainer } from './discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';
import { persistSavedSearch, updateSavedSearch } from '../utils/persist_saved_search';
import { getStateDefaults } from '../utils/get_state_defaults';

export interface SavedSearchContainer {
  savedSearch$: BehaviorSubject<SavedSearch>;
  savedSearchPersisted$: BehaviorSubject<SavedSearch>;
  hasChanged$: BehaviorSubject<boolean>;
  set: (savedSearch: SavedSearch) => SavedSearch;
  get: () => SavedSearch;
  update: (nextDataView: DataView, nextState: AppState) => SavedSearch;
  reset: (id: string | undefined) => Promise<SavedSearch>;
  resetUrl: (id: string | SavedSearch) => Promise<SavedSearch>;
  isPersisted: () => boolean;
  persist: (
    nextSavedSearch: SavedSearch,
    {
      onError,
      onSuccess,
      saveOptions,
    }: {
      onError: (error: Error, savedSearch: SavedSearch) => void;
      onSuccess: (id: string) => void;
      saveOptions: SavedObjectSaveOpts;
    }
  ) => Promise<{ id: string | undefined } | { error: Error | undefined }>;
}

export function getSavedSearchContainer({
  savedSearch,
  appStateContainer,
  services,
}: {
  savedSearch: SavedSearch;
  appStateContainer: AppStateContainer;
  services: DiscoverServices;
}): SavedSearchContainer {
  const savedSearchPersisted$ = new BehaviorSubject(savedSearch);
  const savedSearch$ = new BehaviorSubject(savedSearch);
  const hasChanged$ = new BehaviorSubject(false);
  const set = (newSavedSearch: SavedSearch) => {
    hasChanged$.next(false);
    savedSearch$.next(newSavedSearch);
    savedSearchPersisted$.next(newSavedSearch);
    return newSavedSearch;
  };
  const get = () => {
    return savedSearch$.getValue();
  };

  const reset = async (id: string | undefined) => {
    // any undefined if means it's a new saved search generated
    const dataView = get().searchSource.getField('index');
    const newSavedSearch = await getSavedSearch(id, {
      search: services.data.search,
      savedObjectsClient: services.core.savedObjects.client,
      spaces: services.spaces,
      savedObjectsTagging: services.savedObjectsTagging,
    });
    if (!newSavedSearch.searchSource.getField('index')) {
      newSavedSearch.searchSource.setField('index', dataView);
    }
    restoreStateFromSavedSearch({
      savedSearch: newSavedSearch,
      timefilter: services.timefilter,
    });
    set(newSavedSearch);
    return newSavedSearch;
  };

  const resetUrl = async (id: string | SavedSearch) => {
    const nextSavedSearch = typeof id === 'string' ? await reset(id) : await set(id);
    const newAppState = handleSourceColumnState(
      getStateDefaults({
        savedSearch: nextSavedSearch,
        services,
      }),
      services.uiSettings
    );
    appStateContainer.update(newAppState);
    await appStateContainer.replace(newAppState);
    return nextSavedSearch;
  };

  const persist = (
    nextSavedSearch: SavedSearch,
    {
      onError,
      onSuccess,
      saveOptions,
    }: {
      onError: (error: Error, savedSearch: SavedSearch) => void;
      onSuccess: (id: string) => void;
      saveOptions: SavedObjectSaveOpts;
    }
  ) => {
    return persistSavedSearch(nextSavedSearch, {
      dataView: nextSavedSearch.searchSource.getField('index')!,
      onError,
      onSuccess: (id) => {
        savedSearchPersisted$.next(nextSavedSearch);
        onSuccess(id);
      },
      state: appStateContainer.getState(),
      services,
      saveOptions,
    });
  };

  const isPersisted = () => Boolean(savedSearch$.getValue().id);
  const update = (nextDataView: DataView, nextState: AppState) => {
    const nextSavedSearch = updateSavedSearch({
      savedSearch: { ...get() },
      dataView: nextDataView,
      state: nextState,
      services,
    });
    hasChanged$.next(!isEqual(savedSearch$.getValue(), nextSavedSearch));
    savedSearch$.next(nextSavedSearch);

    return nextSavedSearch;
  };

  return {
    savedSearch$,
    savedSearchPersisted$,
    hasChanged$,
    set,
    reset,
    resetUrl,
    persist,
    isPersisted,
    get,
    update,
  };
}
