/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VIEW_MODE, type SavedSearch } from '@kbn/saved-search-plugin/public';
import { cloneDeep, isEqual, isFunction } from 'lodash';
import type { SearchSourceFields } from '@kbn/data-plugin/public';
import type { FilterCompareOptions } from '@kbn/es-query';
import { COMPARE_ALL_OPTIONS } from '@kbn/es-query';
import { canImportVisContext } from '@kbn/unified-histogram';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { DataGridDensity } from '@kbn/unified-data-table';
import { isEqualFilters } from '../../discover_app_state_container';
import { addLog } from '../../../../../utils/add_log';
import { selectTab } from './tabs';
import { selectTabRuntimeState, type RuntimeStateManager } from '../runtime_state';
import type { DiscoverInternalState } from '../types';
import {
  fromSavedSearchToSavedObjectTab,
  fromTabStateToSavedObjectTab,
} from '../tab_mapping_utils';
import type { DiscoverServices } from '../../../../../build_services';

export const selectHasUnsavedChanges = (
  state: DiscoverInternalState,
  {
    runtimeStateManager,
    services,
  }: { runtimeStateManager: RuntimeStateManager; services: DiscoverServices }
) => {
  const persistedDiscoverSession = state.persistedDiscoverSession;

  if (!persistedDiscoverSession) {
    return false;
  }

  const persistedTabIds = persistedDiscoverSession.tabs.map((tab) => tab.id);
  const currentTabsIds = state.tabs.allIds;

  if (!isEqual(persistedTabIds, currentTabsIds)) {
    return true;
  }

  for (const tabId of currentTabsIds) {
    const persistedTab = persistedDiscoverSession.tabs.find((tab) => tab.id === tabId);

    // this should never happen as we already compare tab ids above
    if (!persistedTab) {
      return true;
    }

    const tabState = selectTab(state, tabId);
    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
    const tabStateContainer = tabRuntimeState?.stateContainer$.getValue();
    const normalizedTab = tabStateContainer
      ? fromSavedSearchToSavedObjectTab({
          tab: tabState,
          savedSearch: tabStateContainer.savedSearchState.getState(),
          services,
        })
      : fromTabStateToSavedObjectTab({
          tab: tabState,
          timeRestore: Boolean(persistedTab.timeRestore),
          services,
        });

    for (const stringKey of Object.keys(tabComparators)) {
      const key = stringKey as keyof DiscoverSessionTab;
      const compare = tabComparators[key] as CompareValues<DiscoverSessionTab[typeof key]>;

      if (!compare(persistedTab[key], normalizedTab[key])) {
        return true;
      }
    }
  }

  return false;
};

type CompareValues<T> = (a: T, b: T) => boolean;

type TabComparators = {
  [K in keyof DiscoverSessionTab]-?: CompareValues<DiscoverSessionTab[K]>;
};

const compareCoerced =
  <T>(defaultValue: T): CompareValues<T> =>
  (a: T | undefined, b: T | undefined) => {
    // Coerce null to undefined
    a ??= undefined;
    b ??= undefined;

    // Equal if both are undefined
    if (a === undefined && b === undefined) {
      return true;
    }

    // Coerce undefined to default value
    a ??= defaultValue;
    b ??= defaultValue;

    return isEqual(a, b);
  };

const compareTabField = <K extends keyof DiscoverSessionTab>(
  _key: K,
  defaultValue: DiscoverSessionTab[K]
) => compareCoerced(defaultValue);

const tabComparators: TabComparators = {
  id: compareTabField('id', ''),
  label: compareTabField('label', ''),
  sort: compareTabField('sort', []),
  columns: compareTabField('columns', []),
  grid: compareTabField('grid', {}),
  hideChart: compareTabField('hideChart', false),
  isTextBasedQuery: compareTabField('isTextBasedQuery', false),
  usesAdHocDataView: compareTabField('usesAdHocDataView', false),
  serializedSearchSource: compareTabField('serializedSearchSource', {}),
  viewMode: compareTabField('viewMode', VIEW_MODE.DOCUMENT_LEVEL),
  hideAggregatedPreview: compareTabField('hideAggregatedPreview', false),
  rowHeight: compareTabField('rowHeight', 0),
  headerRowHeight: compareTabField('headerRowHeight', 0),
  timeRestore: compareTabField('timeRestore', false),
  timeRange: compareTabField('timeRange', { from: '', to: '' }),
  refreshInterval: compareTabField('refreshInterval', { pause: true, value: 0 }),
  rowsPerPage: compareTabField('rowsPerPage', 0),
  sampleSize: compareTabField('sampleSize', 0),
  breakdownField: compareTabField('breakdownField', ''),
  density: compareTabField('density', DataGridDensity.COMPACT),
  visContext: compareTabField('visContext', {}),
};

const FILTERS_COMPARE_OPTIONS: FilterCompareOptions = {
  ...COMPARE_ALL_OPTIONS,
  state: false, // We don't compare filter types (global vs appState).
};

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
