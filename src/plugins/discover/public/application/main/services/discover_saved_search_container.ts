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

export interface LoadParams {
  dataViewSpec?: DataViewSpec;
  dataViewList: DataViewListItem[];
  appState?: AppState;
}

export interface UpdateParams {
  nextDataView: DataView | undefined;
  nextState: AppState;
  resetSavedSearch?: boolean;
  filterAndQuery?: boolean;
}

export type PersistFunction = (
  nextSavedSearch: SavedSearch,
  params: SavedObjectSaveOpts,
  dataView?: DataView
) => Promise<{ id: string | undefined } | undefined>;

export interface SavedSearchContainer {
  get: () => SavedSearch;
  getId: () => string | undefined;
  getTitle: () => string;
  getPersisted$: () => BehaviorSubject<SavedSearch>;
  getVolatile$: () => BehaviorSubject<SavedSearch>;
  hasChanged$: BehaviorSubject<boolean>;
  isPersisted: () => boolean;
  load: (id: string, params: LoadParams) => Promise<SavedSearch>;
  new: (initialDataView: DataView, appState?: AppState) => Promise<SavedSearch>;
  persist: PersistFunction;
  reset: (id?: string) => Promise<SavedSearch | undefined>;
  set: (savedSearch: SavedSearch) => SavedSearch;
  undo: () => void;
  update: (params: UpdateParams) => SavedSearch;
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
  const getPersisted$ = () => savedSearchPersisted$;
  const getVolatile$ = () => savedSearchVolatile$;
  const getTitle = () => {
    return savedSearchVolatile$.getValue().title ?? '';
  };
  const getId = () => {
    return savedSearchVolatile$.getValue().id;
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
    addLog('🔎 [resetUrl] ', nextSavedSearch);
    await set(nextSavedSearch);
    const newAppState = getDefaultAppState(nextSavedSearch, services);
    await appStateContainer.replaceUrlState(newAppState);
    return nextSavedSearch;
  };

  const newSavedSearch = async (nextDataView: DataView | undefined, appState?: AppState) => {
    addLog('🔎 [savedSearch] new', { nextDataView, appState });
    const dataView = nextDataView ?? get().searchSource.getField('index');
    const nextSavedSearch = await getSavedSearch('', {
      search: services.data.search,
      savedObjectsClient: services.core.savedObjects.client,
      spaces: services.spaces,
      savedObjectsTagging: services.savedObjectsTagging,
    });
    nextSavedSearch.searchSource.setField('index', dataView);
    const newAppState = getDefaultAppState(nextSavedSearch, services);
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
    if (appState) {
      await update({
        nextDataView: nextSavedSearch.searchSource.getField('index'),
        nextState: appState,
      });
    }
    return nextSavedSearchToSet;
  };

  const persist: PersistFunction = async (nextSavedSearch, params) => {
    addLog('🔎 [savedSearch] persist', nextSavedSearch);

    const id = await persistSavedSearch(nextSavedSearch, {
      dataView: nextSavedSearch.searchSource.getField('index')!,
      state: appStateContainer.getState(),
      services,
      saveOptions: params,
    });
    if (id) {
      savedSearchPersisted$.next(nextSavedSearch);
    }
    return { id };
  };

  const isPersisted = () => Boolean(savedSearchVolatile$.getValue().id);
  const update = ({ nextDataView, nextState, resetSavedSearch, filterAndQuery }: UpdateParams) => {
    addLog('🔎 [savedSearch] update', { nextDataView, nextState, resetSavedSearch });

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

    if (resetSavedSearch) {
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

  const load = async (id: string, params: LoadParams): Promise<SavedSearch> => {
    const loadedSavedSearch = await loadSavedSearch(id, {
      services,
      appStateContainer,
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
    getId,
    getTitle,
    getPersisted$,
    getVolatile$,
    hasChanged$,
    isPersisted,
    load,
    new: newSavedSearch,
    persist,
    reset,
    set,
    undo,
    update,
  };
}

function getDefaultAppState(savedSearch: SavedSearch, services: DiscoverServices) {
  return handleSourceColumnState(
    getStateDefaults({
      savedSearch,
      services,
    }),
    services.uiSettings
  );
}
