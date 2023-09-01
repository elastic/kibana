/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedSearch } from '@kbn/saved-search-plugin/public';
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
import type { DiscoverGlobalStateContainer } from './discover_global_state_container';

export interface UpdateParams {
  /**
   * The next data view to be used
   */
  nextDataView?: DataView | undefined;
  /**
   * The next AppState that should be used for updating the saved search
   */
  nextState?: DiscoverAppState | undefined;
  /**
   * use filter and query services to update the saved search
   */
  useFilterAndQueryServices?: boolean;
}

/**
 * Container for the saved search state, allowing to load, update and persist the saved search
 * Can also be used to track changes to the saved search
 * It centralizes functionality that was spread across the Discover main codebase
 * There are 2 hooks to access the state of the saved search in React components:
 * - useSavedSearch for the current state, that's updated on every relevant state change
 * - useSavedSearchInitial for the persisted or initial state, just updated when the saved search is peristed or loaded
 */
export interface DiscoverSavedSearchContainer {
  /**
   * Get an BehaviorSubject which contains the current state of the current saved search
   * All modifications are applied to this state
   */
  getCurrent$: () => BehaviorSubject<SavedSearch>;
  /**
   * Get the id of the current saved search
   */
  getId: () => string | undefined;
  /**
   * Get an BehaviorSubject which contains the initial state of the current saved search
   * This is set when a saved search is loaded or a new saved search is initialized
   */
  getInitial$: () => BehaviorSubject<SavedSearch>;
  /**
   * Get the title of the current saved search
   */
  getTitle: () => string | undefined;
  /**
   * Get an BehaviorSubject containing the state if there have been changes to the initial state of the saved search
   * Can be used to track if the saved search has been modified and displayed in the UI
   */
  getHasChanged$: () => BehaviorSubject<boolean>;
  /**
   * Get the current state of the saved search
   */
  getState: () => SavedSearch;
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
  services,
  globalStateContainer,
}: {
  services: DiscoverServices;
  globalStateContainer: DiscoverGlobalStateContainer;
}): DiscoverSavedSearchContainer {
  const initialSavedSearch = services.savedSearch.getNew();
  const savedSearchInitial$ = new BehaviorSubject(initialSavedSearch);
  const savedSearchCurrent$ = new BehaviorSubject(copySavedSearch(initialSavedSearch));
  const hasChanged$ = new BehaviorSubject(false);
  const set = (savedSearch: SavedSearch) => {
    addLog('[savedSearch] set', savedSearch);
    hasChanged$.next(false);
    savedSearchCurrent$.next(savedSearch);
    savedSearchInitial$.next(copySavedSearch(savedSearch));
    return savedSearch;
  };
  const getState = () => savedSearchCurrent$.getValue();
  const getInitial$ = () => savedSearchInitial$;
  const getCurrent$ = () => savedSearchCurrent$;
  const getHasChanged$ = () => hasChanged$;
  const getTitle = () => savedSearchCurrent$.getValue().title;
  const getId = () => savedSearchCurrent$.getValue().id;

  const newSavedSearch = async (nextDataView: DataView | undefined) => {
    addLog('[savedSearch] new', { nextDataView });
    const dataView = nextDataView ?? getState().searchSource.getField('index');
    const nextSavedSearch = services.savedSearch.getNew();
    nextSavedSearch.searchSource.setField('index', dataView);
    const newAppState = getDefaultAppState(nextSavedSearch, services);
    const nextSavedSearchToSet = updateSavedSearch({
      savedSearch: { ...nextSavedSearch },
      dataView,
      state: newAppState,
      globalStateContainer,
      services,
    });
    return set(nextSavedSearchToSet);
  };

  const persist = async (nextSavedSearch: SavedSearch, saveOptions?: SavedObjectSaveOpts) => {
    addLog('[savedSearch] persist', { nextSavedSearch, saveOptions });
    updateSavedSearch({
      savedSearch: nextSavedSearch,
      globalStateContainer,
      services,
      useFilterAndQueryServices: true,
    });

    const id = await services.savedSearch.save(nextSavedSearch, saveOptions || {});

    if (id) {
      set(nextSavedSearch);
    }
    return { id };
  };
  const update = ({ nextDataView, nextState, useFilterAndQueryServices }: UpdateParams) => {
    addLog('[savedSearch] update', { nextDataView, nextState });

    const previousSavedSearch = getState();
    const dataView = nextDataView
      ? nextDataView
      : previousSavedSearch.searchSource.getField('index')!;

    const nextSavedSearch = updateSavedSearch({
      savedSearch: { ...previousSavedSearch },
      dataView,
      state: nextState || {},
      globalStateContainer,
      services,
      useFilterAndQueryServices,
    });

    const hasChanged = !isEqualSavedSearch(savedSearchInitial$.getValue(), nextSavedSearch);
    hasChanged$.next(hasChanged);
    savedSearchCurrent$.next(nextSavedSearch);

    addLog('[savedSearch] update done', nextSavedSearch);
    return nextSavedSearch;
  };

  const load = async (id: string, dataView: DataView | undefined): Promise<SavedSearch> => {
    addLog('[savedSearch] load', { id, dataView });

    const loadedSavedSearch = await services.savedSearch.get(id);

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
    getCurrent$,
    getHasChanged$,
    getId,
    getInitial$,
    getState,
    getTitle,
    load,
    new: newSavedSearch,
    persist,
    set,
    update,
  };
}

/**
 * Copies a saved search object, due to the stateful nature of searchSource it has to be copied with a dedicated function
 * @param savedSearch
 */
export function copySavedSearch(savedSearch: SavedSearch): SavedSearch {
  return {
    ...savedSearch,
    ...{ searchSource: savedSearch.searchSource.createCopy() },
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
