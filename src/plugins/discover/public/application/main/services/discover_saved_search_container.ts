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
  id: string,
  {
    setError,
    dataViewSpec,
    dataViewList,
  }: {
    setError: (e: Error) => void;
    dataViewSpec?: DataViewSpec;
    dataViewList: DataViewListItem[];
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
  savedSearch$: BehaviorSubject<SavedSearch>;
  savedSearchPersisted$: BehaviorSubject<SavedSearch>;
  hasChanged$: BehaviorSubject<boolean>;
  set: (savedSearch: SavedSearch) => SavedSearch;
  load: LoadFunction;
  get: () => SavedSearch;
  update: UpdateFunction;
  reset: (id: string | undefined) => Promise<SavedSearch | undefined>;
  resetUrl: (id: SavedSearch) => Promise<SavedSearch | undefined>;
  undo: () => void;
  isPersisted: () => boolean;
  persist: PersistFunction;
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
    await appStateContainer.replaceUrlState(newAppState);
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
    addLog('🔎 [savedSearch] persist', nextSavedSearch);
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
      const { searchSource: prevSearchSource, ...prevSavedSearch } =
        savedSearchPersisted$.getValue();
      const { searchSource: nextSearchSource, ...nextSavedSearchWithoutSearchSource } =
        nextSavedSearch;

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
        addLog('🔎 [savedSearch] difference between persisted and changed version');
      }

      hasChanged$.next(hasChanged);
      savedSearchVolatile$.next(nextSavedSearch);
      addLog('🔎 [savedSearch] updated savedSearch', nextSavedSearch);
    }
    return nextSavedSearch;
  };
  const undo = () => {
    return resetUrl(savedSearchPersisted$.getValue());
  };

  const load: LoadFunction = (id, { setError, dataViewSpec, dataViewList }) => {
    return loadSavedSearch(id, {
      services,
      appStateContainer,
      dataViewList,
      dataViewSpec,
      setError,
    });
  };

  return {
    savedSearch$: savedSearchVolatile$,
    savedSearchPersisted$,
    hasChanged$,
    load,
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
