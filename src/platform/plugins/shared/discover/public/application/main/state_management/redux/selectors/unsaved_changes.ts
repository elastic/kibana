/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { isEqual, isObject, omit } from 'lodash';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import type { FilterCompareOptions } from '@kbn/es-query';
import { COMPARE_ALL_OPTIONS, isOfAggregateQueryType } from '@kbn/es-query';
import { canImportVisContext } from '@kbn/unified-histogram';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { DataGridDensity } from '@kbn/unified-data-table';
import type { VisContextUnmapped } from '@kbn/saved-search-plugin/common/types';
import { isEqualFilters } from '../../utils/state_comparators';
import { addLog } from '../../../../../utils/add_log';
import { selectTab } from './tabs';
import { selectTabRuntimeState, type RuntimeStateManager } from '../runtime_state';
import type { DiscoverInternalState } from '../types';
import {
  fromSavedObjectTabToTabState,
  fromSavedSearchToSavedObjectTab,
  fromTabStateToSavedObjectTab,
} from '../tab_mapping_utils';
import type { DiscoverServices } from '../../../../../build_services';
import { getInitialAppState } from '../../utils/get_initial_app_state';
import { getSerializedSearchSourceDataViewDetails } from '../utils';

export interface HasUnsavedChangesResult {
  hasUnsavedChanges: boolean;
  unsavedTabIds: string[];
}

export const selectHasUnsavedChanges = (
  state: DiscoverInternalState,
  {
    runtimeStateManager,
    services,
  }: {
    runtimeStateManager: RuntimeStateManager;
    services: DiscoverServices;
  }
): HasUnsavedChangesResult => {
  const persistedDiscoverSession = state.persistedDiscoverSession;

  if (!persistedDiscoverSession) {
    return { hasUnsavedChanges: false, unsavedTabIds: [] };
  }

  const persistedTabIds = persistedDiscoverSession.tabs.map((tab) => tab.id);
  const currentTabsIds = state.tabs.allIds;

  let tabIdsChanged = false;

  if (!isEqual(persistedTabIds, currentTabsIds)) {
    tabIdsChanged = true;
    addLog('[DiscoverSession] difference between initial and changed version: tab ids', {
      before: persistedTabIds,
      after: currentTabsIds,
    });
  }

  const unsavedTabIds: string[] = [];

  for (const tabId of currentTabsIds) {
    const persistedTab = persistedDiscoverSession.tabs.find((tab) => tab.id === tabId);

    if (!persistedTab) {
      unsavedTabIds.push(tabId);
      continue;
    }

    // Ensure the persisted tab accounts for default app state values when comparing,
    // otherwise initializing a tab could automatically trigger unsaved changes.
    const persistedTabWithDefaults = fromTabStateToSavedObjectTab({
      tab: fromSavedObjectTabToTabState({
        tab: persistedTab,
        initialAppState: getInitialAppState({
          initialUrlState: undefined,
          persistedTab,
          dataView: getSerializedSearchSourceDataViewDetails(
            persistedTab.serializedSearchSource,
            state.savedDataViews
          ),
          services,
        }),
      }),
      overridenTimeRestore: Boolean(persistedTab.timeRestore),
      services,
    });

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
          overridenTimeRestore: Boolean(persistedTab.timeRestore),
          services,
        });

    for (const stringKey of Object.keys(TAB_COMPARATORS)) {
      const key = stringKey as keyof DiscoverSessionTab;
      const compare = TAB_COMPARATORS[key] as FieldComparator<DiscoverSessionTab[typeof key]>;
      const prevField = persistedTabWithDefaults[key];
      const nextField = normalizedTab[key];

      if (!compare(prevField, nextField)) {
        addLog('[DiscoverSession] difference between initial and changed version', {
          tabId,
          key,
          before: prevField,
          after: nextField,
        });

        unsavedTabIds.push(tabId);
        break;
      }
    }
  }

  const hasUnsavedChanges = tabIdsChanged || unsavedTabIds.length > 0;

  if (!hasUnsavedChanges) {
    addLog('[DiscoverSession] no difference between initial and changed version');
  }

  return { hasUnsavedChanges, unsavedTabIds };
};

type FieldComparator<T> = (a: T, b: T) => boolean;

type TabComparators = {
  [K in keyof DiscoverSessionTab]-?: FieldComparator<DiscoverSessionTab[K]>;
};

const NOOP_COMPARATOR: FieldComparator<unknown> = () => true;

const defaultValueComparator =
  <T>(defaultValue: T): FieldComparator<T> =>
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

const fieldComparator = <K extends keyof DiscoverSessionTab>(
  _field: K,
  defaultValue: DiscoverSessionTab[K]
) => defaultValueComparator(defaultValue);

const FILTER_COMPARE_OPTIONS: FilterCompareOptions = {
  ...COMPARE_ALL_OPTIONS,
  state: false, // We don't compare filter types (global vs appState).
};

// ad-hoc data view id can change, so we rather compare the ES|QL query itself here
const getAdjustedDataViewId = (searchSource: SerializedSearchSourceFields) =>
  isOfAggregateQueryType(searchSource.query)
    ? searchSource.query.esql
    : isObject(searchSource.index)
    ? searchSource.index.id
    : searchSource.index;

export const searchSourceComparator: TabComparators['serializedSearchSource'] = (
  searchSourceA,
  searchSourceB
) => {
  const filtersA = searchSourceA.filter ?? [];
  const filtersB = searchSourceB.filter ?? [];

  return (
    // if a filter gets pinned and the order of filters does not change,
    // we don't show the unsaved changes badge
    isEqualFilters(filtersA, filtersB, FILTER_COMPARE_OPTIONS) &&
    isEqual(searchSourceA.query, searchSourceB.query) &&
    getAdjustedDataViewId(searchSourceA) === getAdjustedDataViewId(searchSourceB)
  );
};

// ignore differences in title as it sometimes does not match the actual vis type/shape
const getAdjustedVisContext = (visContext: VisContextUnmapped | undefined) =>
  canImportVisContext(visContext) && visContext.attributes.title
    ? omit(visContext, 'attributes.title')
    : visContext;

const visContextComparator: TabComparators['visContext'] = (visContextA, visContextB) => {
  return isEqual(getAdjustedVisContext(visContextA), getAdjustedVisContext(visContextB));
};

const TAB_COMPARATORS: TabComparators = {
  id: fieldComparator('id', ''),
  label: fieldComparator('label', ''),
  sort: fieldComparator('sort', []),
  columns: fieldComparator('columns', []),
  grid: fieldComparator('grid', {}),
  hideChart: fieldComparator('hideChart', false),
  // isTextBasedQuery is derived from the query itself and can be ignored
  isTextBasedQuery: NOOP_COMPARATOR,
  // usesAdHocDataView is derived from the data view itself and can be ignored
  usesAdHocDataView: NOOP_COMPARATOR,
  serializedSearchSource: searchSourceComparator,
  // By default, viewMode: undefined is equivalent to documents view
  // So they should be treated as same
  viewMode: fieldComparator('viewMode', VIEW_MODE.DOCUMENT_LEVEL),
  hideAggregatedPreview: fieldComparator('hideAggregatedPreview', false),
  rowHeight: fieldComparator('rowHeight', 0),
  headerRowHeight: fieldComparator('headerRowHeight', 0),
  timeRestore: fieldComparator('timeRestore', false),
  timeRange: fieldComparator('timeRange', { from: '', to: '' }),
  refreshInterval: fieldComparator('refreshInterval', { pause: true, value: 0 }),
  rowsPerPage: fieldComparator('rowsPerPage', 0),
  sampleSize: fieldComparator('sampleSize', 0),
  chartInterval: fieldComparator('chartInterval', 'auto'),
  breakdownField: fieldComparator('breakdownField', ''),
  density: fieldComparator('density', DataGridDensity.COMPACT),
  visContext: visContextComparator,
  controlGroupJson: (a, b) => {
    // ignore the order of keys when comparing JSON strings
    const testA = JSON.parse(a ?? '{}');
    const testB = JSON.parse(b ?? '{}');
    return isEqual(testA, testB);
  },
};
