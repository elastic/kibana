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
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import { updateSavedSearch } from './utils/update_saved_search';
import { addLog } from '../../../utils/add_log';
import type { DiscoverAppState } from './discover_app_state_container';
import type { DiscoverServices } from '../../../build_services';
import type { InternalStateStore, TabState } from './redux';

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
 * There are 2 hooks to access the state of the saved search in React components:
 * - useSavedSearch for the current state, that's updated on every relevant state change
 */
export interface DiscoverSavedSearchContainer {
  /**
   * Enable/disable kbn url tracking (That's the URL used when selecting Discover in the side menu)
   */
  initUrlTracking: () => () => void;
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
  /**
   * Updates the current state of the saved search with new time range and refresh interval
   */
  updateTimeRange: () => void;
  /**
   * Updates the current value of visContext in saved search
   * @param params
   */
  updateVisContext: (params: { nextVisContext: UnifiedHistogramVisContext | undefined }) => void;
  /**
   * Updates the current value of controlState in saved search
   * @param params
   */
  updateControlState: (params: { nextControlState: ControlPanelsState }) => void;
}

export function getSavedSearchContainer({
  services,
  internalState,
  getCurrentTab,
}: {
  services: DiscoverServices;
  internalState: InternalStateStore;
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
  const getTitle = () => savedSearchCurrent$.getValue().title;
  const getId = () => savedSearchCurrent$.getValue().id;

  const initUrlTracking = () => {
    const subscription = savedSearchCurrent$.subscribe((savedSearch) => {
      const dataView = savedSearch.searchSource.getField('index');

      if (!dataView?.id) {
        return;
      }

      const dataViewSupportsTracking =
        // Disable for ad hoc data views, since they can't be restored after a page refresh
        dataView.isPersisted() ||
        // Unless it's a default profile data view, which can be restored on refresh
        internalState.getState().defaultProfileAdHocDataViewIds.includes(dataView.id) ||
        // Or we're in ES|QL mode, in which case we don't care about the data view
        isOfAggregateQueryType(savedSearch.searchSource.getField('query'));

      const trackingEnabled = dataViewSupportsTracking || Boolean(savedSearch.id);

      services.urlTracker.setTrackingEnabled(trackingEnabled);
    });

    return () => {
      subscription.unsubscribe();
    };
  };

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
      initialInternalState: undefined,
      appState: nextState || {},
      globalState: getCurrentTab().globalState,
      services,
      useFilterAndQueryServices,
    });

    assignNextSavedSearch({ nextSavedSearch });

    addLog('[savedSearch] update done', nextSavedSearch);
    return nextSavedSearch;
  };

  const updateTimeRange = () => {
    const previousSavedSearch = getState();
    if (!previousSavedSearch.timeRestore) {
      return;
    }
    const refreshInterval = services.timefilter.getRefreshInterval();
    const nextSavedSearch: SavedSearch = {
      ...previousSavedSearch,
      timeRange: services.timefilter.getTime(),
      refreshInterval: { value: refreshInterval.value, pause: refreshInterval.pause },
    };

    assignNextSavedSearch({ nextSavedSearch });

    addLog('[savedSearch] updateWithTimeRange done', nextSavedSearch);
  };

  const updateVisContext = ({
    nextVisContext,
  }: {
    nextVisContext: UnifiedHistogramVisContext | undefined;
  }) => {
    const previousSavedSearch = getState();
    const nextSavedSearch: SavedSearch = {
      ...previousSavedSearch,
      visContext: nextVisContext,
    };

    assignNextSavedSearch({ nextSavedSearch });

    addLog('[savedSearch] updateVisContext done', nextSavedSearch);
  };

  const updateControlState = ({
    nextControlState,
  }: {
    nextControlState: ControlPanelsState | undefined;
  }) => {
    const previousSavedSearch = getState();
    const nextSavedSearch: SavedSearch = {
      ...previousSavedSearch,
      controlGroupJson: JSON.stringify(nextControlState),
    };

    assignNextSavedSearch({ nextSavedSearch });

    addLog('[savedSearch] updateControlState done', nextSavedSearch);
  };

  return {
    initUrlTracking,
    getCurrent$,
    getId,
    getInitial$,
    getState,
    getTitle,
    set,
    assignNextSavedSearch: (nextSavedSearch) => assignNextSavedSearch({ nextSavedSearch }),
    update,
    updateTimeRange,
    updateVisContext,
    updateControlState,
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
