/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { cloneDeep } from 'lodash';
import type { FilterCompareOptions } from '@kbn/es-query';
import { COMPARE_ALL_OPTIONS, isOfAggregateQueryType, updateFilterReferences } from '@kbn/es-query';
import type { SearchSourceFields } from '@kbn/data-plugin/common';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram';
import { canImportVisContext } from '@kbn/unified-histogram';
import type { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import { isEqual, isFunction } from 'lodash';
import { i18n } from '@kbn/i18n';
import { VIEW_MODE } from '../../../../common/constants';
import { updateSavedSearch } from './utils/update_saved_search';
import { addLog } from '../../../utils/add_log';
import type { DiscoverAppState } from './discover_app_state_container';
import { isEqualFilters } from './discover_app_state_container';
import type { DiscoverServices } from '../../../build_services';
import type { DiscoverGlobalStateContainer } from './discover_global_state_container';
import type { InternalStateStore } from './redux';

const FILTERS_COMPARE_OPTIONS: FilterCompareOptions = {
  ...COMPARE_ALL_OPTIONS,
  state: false, // We don't compare filter types (global vs appState).
};

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
   * Get an BehaviorSubject containing the state if there have been changes to the initial state of the saved search
   * Can be used to track if the saved search has been modified and displayed in the UI
   */
  getHasChanged$: () => BehaviorSubject<boolean>;
  /**
   * Get the current state of the saved search
   */
  getState: () => SavedSearch;
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
   * Similar to set, but does not reset the initial state,
   * ensuring unsaved changes are tracked
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
}

export function getSavedSearchContainer({
  services,
  globalStateContainer,
  internalState,
}: {
  services: DiscoverServices;
  globalStateContainer: DiscoverGlobalStateContainer;
  internalState: InternalStateStore;
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

  const persist = async (nextSavedSearch: SavedSearch, saveOptions?: SavedObjectSaveOpts) => {
    addLog('[savedSearch] persist', { nextSavedSearch, saveOptions });

    const dataView = nextSavedSearch.searchSource.getField('index');
    const profileDataViewIds = internalState.getState().defaultProfileAdHocDataViewIds;
    let replacementDataView: DataView | undefined;

    // If the Discover session is using a default profile ad hoc data view,
    // we copy it with a new ID to avoid conflicts with the profile defaults
    if (dataView?.id && profileDataViewIds.includes(dataView.id)) {
      const replacementSpec: DataViewSpec = {
        ...dataView.toSpec(),
        id: uuidv4(),
        name: i18n.translate('discover.savedSearch.defaultProfileDataViewCopyName', {
          defaultMessage: '{dataViewName} ({discoverSessionTitle})',
          values: {
            dataViewName: dataView.name ?? dataView.getIndexPattern(),
            discoverSessionTitle: nextSavedSearch.title,
          },
        }),
      };

      // Skip field list fetching since the existing data view already has the fields
      replacementDataView = await services.dataViews.create(replacementSpec, true);
    }

    updateSavedSearch({
      savedSearch: nextSavedSearch,
      globalStateContainer,
      services,
      useFilterAndQueryServices: true,
      dataView: replacementDataView,
    });

    const currentFilters = nextSavedSearch.searchSource.getField('filter');

    // If the data view was replaced, we need to update the filter references
    if (dataView?.id && replacementDataView?.id && Array.isArray(currentFilters)) {
      nextSavedSearch.searchSource.setField(
        'filter',
        updateFilterReferences(currentFilters, dataView.id, replacementDataView.id)
      );
    }

    const id = await services.savedSearch.save(nextSavedSearch, saveOptions || {});

    if (id) {
      set(nextSavedSearch);
    }

    return { id };
  };

  const assignNextSavedSearch = ({ nextSavedSearch }: { nextSavedSearch: SavedSearch }) => {
    const hasChanged = !isEqualSavedSearch(savedSearchInitial$.getValue(), nextSavedSearch);
    hasChanged$.next(hasChanged);
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
      state: nextState || {},
      globalStateContainer,
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

  return {
    initUrlTracking,
    getCurrent$,
    getHasChanged$,
    getId,
    getInitial$,
    getState,
    getTitle,
    persist,
    set,
    assignNextSavedSearch: (nextSavedSearch) => assignNextSavedSearch({ nextSavedSearch }),
    update,
    updateTimeRange,
    updateVisContext,
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

export function isEqualSavedSearch(savedSearchPrev: SavedSearch, savedSearchNext: SavedSearch) {
  const { searchSource: prevSearchSource, ...prevSavedSearch } = savedSearchPrev;
  const { searchSource: nextSearchSource, ...nextSavedSearchWithoutSearchSource } = savedSearchNext;

  const keys = new Set([
    ...Object.keys(prevSavedSearch),
    ...Object.keys(nextSavedSearchWithoutSearchSource),
  ] as Array<keyof Omit<SavedSearch, 'searchSource'>>);

  // at least one change in saved search attributes
  const hasChangesInSavedSearch = [...keys].some((key) => {
    if (
      ['usesAdHocDataView', 'hideChart'].includes(key) &&
      typeof prevSavedSearch[key] === 'undefined' &&
      nextSavedSearchWithoutSearchSource[key] === false
    ) {
      return false; // ignore when value was changed from `undefined` to `false` as it happens per app logic, not by a user action
    }

    const prevValue = getSavedSearchFieldForComparison(prevSavedSearch, key);
    const nextValue = getSavedSearchFieldForComparison(nextSavedSearchWithoutSearchSource, key);

    const isSame = isEqual(prevValue, nextValue);

    if (!isSame) {
      addLog('[savedSearch] difference between initial and changed version', {
        key,
        before: prevSavedSearch[key],
        after: nextSavedSearchWithoutSearchSource[key],
      });
    }

    return !isSame;
  });

  if (hasChangesInSavedSearch) {
    return false;
  }

  // at least one change in search source fields
  const hasChangesInSearchSource = (
    ['filter', 'query', 'index'] as Array<keyof SearchSourceFields>
  ).some((key) => {
    const prevValue = getSearchSourceFieldValueForComparison(prevSearchSource, key);
    const nextValue = getSearchSourceFieldValueForComparison(nextSearchSource, key);

    const isSame =
      key === 'filter'
        ? isEqualFilters(prevValue, nextValue, FILTERS_COMPARE_OPTIONS) // if a filter gets pinned and the order of filters does not change, we don't show the unsaved changes badge
        : isEqual(prevValue, nextValue);

    if (!isSame) {
      addLog('[savedSearch] difference between initial and changed version', {
        key,
        before: prevValue,
        after: nextValue,
      });
    }

    return !isSame;
  });

  if (hasChangesInSearchSource) {
    return false;
  }

  addLog('[savedSearch] no difference between initial and changed version');

  return true;
}

function getSavedSearchFieldForComparison(
  savedSearch: Omit<SavedSearch, 'searchSource'>,
  fieldName: keyof Omit<SavedSearch, 'searchSource'>
) {
  if (fieldName === 'visContext') {
    const visContext = cloneDeep(savedSearch.visContext);
    if (canImportVisContext(visContext) && visContext?.attributes?.title) {
      // ignore differences in title as it sometimes does not match the actual vis type/shape
      visContext.attributes.title = 'same';
    }
    return visContext;
  }

  if (fieldName === 'breakdownField') {
    return savedSearch.breakdownField || ''; // ignore the difference between an empty string and undefined
  }

  if (fieldName === 'viewMode') {
    // By default, viewMode: undefined is equivalent to documents view
    // So they should be treated as same
    return savedSearch.viewMode ?? VIEW_MODE.DOCUMENT_LEVEL;
  }

  return savedSearch[fieldName];
}

function getSearchSourceFieldValueForComparison(
  searchSource: SavedSearch['searchSource'],
  searchSourceFieldName: keyof SearchSourceFields
) {
  if (searchSourceFieldName === 'index') {
    const query = searchSource.getField('query');
    // ad-hoc data view id can change, so we rather compare the ES|QL query itself here
    return query && 'esql' in query ? query.esql : searchSource.getField('index')?.id;
  }

  if (searchSourceFieldName === 'filter') {
    const filterField = searchSource.getField('filter');
    return isFunction(filterField) ? filterField() : filterField;
  }

  return searchSource.getField(searchSourceFieldName);
}
