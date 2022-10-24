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
import { differenceWith, isEqual, toPairs } from 'lodash';
import { updateSavedSearch } from '../utils/update_saved_search';
import { addLog } from '../../../utils/addLog';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import { AppState, DiscoverAppStateContainer } from './discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';
import { persistSavedSearch } from '../utils/persist_saved_search';
import { getStateDefaults } from '../utils/get_state_defaults';

export interface PersistParams {
  onError: (error: Error, savedSearch: SavedSearch) => void;
  onSuccess: (id: string) => void;
  saveOptions: SavedObjectSaveOpts;
}

export interface SavedSearchContainer {
  savedSearch$: BehaviorSubject<SavedSearch>;
  savedSearchPersisted$: BehaviorSubject<SavedSearch>;
  hasChanged$: BehaviorSubject<boolean>;
  set: (savedSearch: SavedSearch) => SavedSearch;
  get: () => SavedSearch;
  update: (
    nextDataView: DataView | undefined,
    nextState: AppState,
    resetSavedSearch?: boolean,
    filterAndQuery?: boolean
  ) => SavedSearch;
  reset: (id: string | undefined) => Promise<SavedSearch>;
  resetUrl: (id: string | SavedSearch) => Promise<SavedSearch>;
  undo: () => void;
  isPersisted: () => boolean;
  persist: (
    nextSavedSearch: SavedSearch,
    params: PersistParams,
    dataView?: DataView
  ) => Promise<{ id: string | undefined } | undefined>;
  new: () => Promise<SavedSearch>;
}

export function getSavedSearchContainer({
  savedSearch,
  appStateContainer,
  services,
}: {
  savedSearch: SavedSearch;
  appStateContainer: DiscoverAppStateContainer;
  services: DiscoverServices;
}): SavedSearchContainer {
  const savedSearchPersisted$ = new BehaviorSubject(savedSearch);
  const savedSearch$ = new BehaviorSubject(savedSearch);
  const hasChanged$ = new BehaviorSubject(false);
  const set = (newSavedSearch: SavedSearch) => {
    addLog('🔎 [savedSearch] set', newSavedSearch);
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
    await appStateContainer.replace(newAppState, false);
    return nextSavedSearch;
  };

  const newSavedSearch = async () => {
    addLog('🔎 [savedSearch] new');
    const dataView = get().searchSource.getField('index');
    const nextSavedSearch = await getSavedSearch('', {
      search: services.data.search,
      savedObjectsClient: services.core.savedObjects.client,
      spaces: services.spaces,
      savedObjectsTagging: services.savedObjectsTagging,
    });
    nextSavedSearch.searchSource.setField('index', dataView);
    const newAppState = handleSourceColumnState(
      getStateDefaults({
        savedSearch: nextSavedSearch,
        services,
      }),
      services.uiSettings
    );
    const nextSavedSearchToSet = updateSavedSearch(
      {
        savedSearch: { ...nextSavedSearch },
        dataView: dataView ? dataView : get().searchSource.getField('index')!,
        state: newAppState,
        services,
      },
      true
    );
    set(nextSavedSearchToSet);
    return nextSavedSearchToSet;
  };

  const persist = async (
    nextSavedSearch: SavedSearch,
    params: PersistParams,
    dataView?: DataView
  ) => {
    addLog('🔎 [savedSearch] persists', nextSavedSearch);
    try {
      const id = await persistSavedSearch(nextSavedSearch, {
        dataView: dataView ?? nextSavedSearch.searchSource.getField('index')!,
        state: appStateContainer.getState(),
        services,
        saveOptions: params.saveOptions,
      });
      if (id) {
        savedSearchPersisted$.next(nextSavedSearch);
        params.onSuccess(id);
      }
      return { id };
    } catch (e) {
      params.onError(e, nextSavedSearch);
    }
  };

  const isPersisted = () => Boolean(savedSearch$.getValue().id);
  const update = (
    nextDataView: DataView | undefined,
    nextState: AppState,
    resetPersisted: boolean = false,
    filterAndQuery: boolean = false
  ) => {
    addLog('🔎 [savedSearch] update', { nextDataView, nextState, resetPersisted });

    const previousSavedSearch = get();
    const prevSearchSource = savedSearchPersisted$.getValue().searchSource.getFields();
    const nextSavedSearch = updateSavedSearch(
      {
        savedSearch: { ...previousSavedSearch },
        dataView: nextDataView ? nextDataView : previousSavedSearch.searchSource.getField('index')!,
        state: nextState,
        services,
      },
      !filterAndQuery
    );
    if (resetPersisted) {
      set(nextSavedSearch);
    } else {
      // detect changes to persisted version
      const prevSavedSearch = savedSearchPersisted$.getValue();
      const savedSearchDiff = differenceWith(
        toPairs(prevSavedSearch),
        toPairs(nextSavedSearch),
        isEqual
      );
      const nextSearchSource = nextSavedSearch.searchSource.getFields();
      const searchSourceDiff = differenceWith(
        toPairs(prevSearchSource),
        toPairs(nextSearchSource),
        isEqual
      );
      const allDiff = [...savedSearchDiff, ...searchSourceDiff];
      if (allDiff.length) {
        addLog('🔎 [savedSearch] difference between persisted and changed version', allDiff);
      }

      const hasChanged = Boolean(allDiff.length);
      hasChanged$.next(hasChanged);
      addLog('🔎 [savedSearch] updated savedSearch', nextSavedSearch);
      savedSearch$.next(nextSavedSearch);
    }
    return nextSavedSearch;
  };
  const undo = () => {
    return resetUrl(get().id || '');
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
    undo,
    new: newSavedSearch,
  };
}
