/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { updateSavedSearch } from './utils/update_saved_search';
import { addLog } from '../../../utils/add_log';
import type { DiscoverAppState } from './redux';
import type { DiscoverServices } from '../../../build_services';
import type { TabState } from './redux';

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
 * Container for the saved search state, allowing to update the saved search
 * It centralizes functionality that was spread across the Discover main codebase
 */
export interface DiscoverSavedSearchContainer {
  /**
   * Get an BehaviorSubject which contains the current state of the current saved search
   * All modifications are applied to this state
   */
  getCurrent$: () => BehaviorSubject<SavedSearch>;
  /**
   * Get an BehaviorSubject which contains the initial state of the current saved search
   * This is set when a saved search is loaded or a new saved search is initialized
   */
  getInitial$: () => BehaviorSubject<SavedSearch>;
  /**
   * Get the current state of the saved search
   */
  getState: () => SavedSearch;
  /**
   * Set the persisted & current state of the saved search
   * Happens when a saved search is loaded or a new one is created
   * @param savedSearch
   */
  set: (savedSearch: SavedSearch) => SavedSearch;
  /**
   * Similar to set, but does not reset the initial state
   * @param nextSavedSearch
   */
  assignNextSavedSearch: (nextSavedSearch: SavedSearch) => void;
  /**
   * Updates the current state of the saved search
   * @param params
   */
  update: (params: UpdateParams) => SavedSearch;
}

export function getSavedSearchContainer({
  services,
  getCurrentTab,
}: {
  services: DiscoverServices;
  getCurrentTab: () => TabState;
}): DiscoverSavedSearchContainer {
  const initialSavedSearch = services.savedSearch.getNew();
  const savedSearchInitial$ = new BehaviorSubject(initialSavedSearch);
  const savedSearchCurrent$ = new BehaviorSubject(copySavedSearch(initialSavedSearch));
  const set = (savedSearch: SavedSearch) => {
    addLog('[savedSearch] set', savedSearch);
    savedSearchCurrent$.next(savedSearch);
    savedSearchInitial$.next(copySavedSearch(savedSearch));
    return savedSearch;
  };
  const getState = () => savedSearchCurrent$.getValue();
  const getInitial$ = () => savedSearchInitial$;
  const getCurrent$ = () => savedSearchCurrent$;

  const assignNextSavedSearch = ({ nextSavedSearch }: { nextSavedSearch: SavedSearch }) => {
    savedSearchCurrent$.next(nextSavedSearch);
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
      appState: nextState || {},
      globalState: getCurrentTab().globalState,
      services,
      useFilterAndQueryServices,
    });

    assignNextSavedSearch({ nextSavedSearch });

    addLog('[savedSearch] update done', nextSavedSearch);
    return nextSavedSearch;
  };

  return {
    getCurrent$,
    getInitial$,
    getState,
    set,
    assignNextSavedSearch: (nextSavedSearch) => assignNextSavedSearch({ nextSavedSearch }),
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
