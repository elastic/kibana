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
import { isEqual } from 'lodash';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { SearchSourceFields } from '@kbn/data-plugin/common';
import { loadSavedSearch } from '../utils/load_saved_search';
import { updateSavedSearch } from '../utils/update_saved_search';
import { addLog } from '../../../utils/add_log';
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

export type LoadFunction = (
  id: string | undefined,
  {
    dataViewSpec,
    dataViewList,
    appState,
    updateWithAppState,
  }: {
    dataViewSpec?: DataViewSpec;
    dataViewList: DataViewListItem[];
    appState: AppState;
    updateWithAppState: boolean;
  }
) => Promise<SavedSearch | undefined>;

export type UpdateFunction = (
  nextDataView: DataView | undefined,
  nextState: AppState,
  resetSavedSearch?: boolean,
  filterAndQuery?: boolean
) => SavedSearch;

export type PersistFunction = (
  nextSavedSearch: SavedSearch,
  params: PersistParams,
  dataView?: DataView
) => Promise<{ id: string | undefined } | undefined>;

export interface SavedSearchContainer {
  /**
   * Get the current saved search state
   */
  get: () => SavedSearch;
  /**
   * BehaviorSubject keeping the state if the current saved search is different to the persisted / new one
   * If true there have been edits to the original state
   */
  hasChanged$: BehaviorSubject<boolean>;
  /**
   * Determines if the saved search has already been persisted
   */
  isPersisted: () => boolean;
  /**
   * Loading a saved search by its id
   */
  load: LoadFunction;
  /**
   * Creating a new saved search
   */
  new: () => Promise<SavedSearch>;
  /**
   * Persist the give saved search
   */
  persist: PersistFunction;
  /**
   * the saved search with the given id is loaded and replaces the previous saved search state
   */
  reset: (id: string | undefined) => Promise<SavedSearch | undefined>;
  /**
   * The given savedSearch replaces the current one, and the derived app state is propagated to URL
   */
  resetUrl: (savedSearch: SavedSearch) => Promise<SavedSearch | undefined>;
  /**
   * BehaviorSubject of the current state of the saved search
   */
  savedSearch$: BehaviorSubject<SavedSearch>;
  /**
   * BehaviorSubject of the persisted/new state of the saved search
   */
  savedSearchPersisted$: BehaviorSubject<SavedSearch>;
  /**
   * Replaces the current saved search with a new one
   * @param savedSearch
   */
  set: (savedSearch: SavedSearch) => SavedSearch;
  /**
   * Undo changes of the current saved search, reset to the persisted/new state
   */
  undo: () => void;
  /**
   * Update the current saved search with a different data view / app state
   */
  update: UpdateFunction;
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
  const savedSearchVolatile$ = new BehaviorSubject(savedSearch);
  const hasChanged$ = new BehaviorSubject(false);
  const set = (newSavedSearch: SavedSearch) => {
    addLog('🔎 [savedSearch] set', newSavedSearch);
    hasChanged$.next(false);
    savedSearchVolatile$.next(newSavedSearch);
    const persistedSavedSearch = {
      ...newSavedSearch,
      ...{ searchSource: newSavedSearch.searchSource.createCopy() },
    };
    savedSearchPersisted$.next(persistedSavedSearch);
    return newSavedSearch;
  };
  const get = () => {
    return savedSearchVolatile$.getValue();
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

  const resetUrl = async (nextSavedSearch: SavedSearch) => {
    await set(nextSavedSearch);
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

  const persist: PersistFunction = async (nextSavedSearch, params, dataView?) => {
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

  const isPersisted = () => Boolean(savedSearchVolatile$.getValue().id);
  const update: UpdateFunction = (
    nextDataView,
    nextState,
    resetPersisted = false,
    filterAndQuery = false
  ) => {
    addLog('🔎 [savedSearch] update', { nextDataView, nextState, resetPersisted });

    const previousSavedSearch = get();

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
      const persistedSavedSearch = savedSearchPersisted$.getValue();
      const allKeys = [
        ...new Set([...Object.keys(persistedSavedSearch), ...Object.keys(nextSavedSearch)]),
      ] as Array<keyof SavedSearch>;
      const changedKeys = [];
      for (const key of allKeys) {
        if (key === 'searchSource') {
          continue;
        }
        if (!isEqual(persistedSavedSearch[key], nextSavedSearch[key])) {
          changedKeys.push(key);
        }
      }

      const searchSourceDiff = (
        ['filter', 'query', 'index'] as Array<keyof SearchSourceFields>
      ).filter((value) => {
        return !isEqual(
          persistedSavedSearch.searchSource.getField(value),
          nextSavedSearch.searchSource.getField(value)
        );
      });
      const hasChanged = Boolean(changedKeys.length || searchSourceDiff.length);

      hasChanged$.next(hasChanged);
      savedSearchVolatile$.next(nextSavedSearch);
      addLog('🔎 [savedSearch] updated savedSearch', {
        nextSavedSearch,
        hasChanged,
        changedKeys,
        searchSourceDiff,
      });
    }
    return nextSavedSearch;
  };
  const undo = () => {
    return resetUrl(savedSearchPersisted$.getValue());
  };

  const load: LoadFunction = async (
    id,
    { dataViewSpec, dataViewList, appState, updateWithAppState }
  ) => {
    const nextSavedSearch = await loadSavedSearch(id, {
      services,
      dataViewId: appState.index,
      dataViewList,
      dataViewSpec,
    });
    if (nextSavedSearch) {
      set(nextSavedSearch);
      if (updateWithAppState) {
        update(undefined, appState);
      }
      return get();
    }
  };

  return {
    get,
    hasChanged$,
    isPersisted,
    load,
    new: newSavedSearch,
    persist,
    reset,
    resetUrl,
    savedSearch$: savedSearchVolatile$,
    savedSearchPersisted$,
    set,
    undo,
    update,
  };
}
