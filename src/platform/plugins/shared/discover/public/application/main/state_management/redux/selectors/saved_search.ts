/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchSource } from '@kbn/data-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { selectTab } from './tabs';
import { selectTabRuntimeState, type RuntimeStateManager } from '../runtime_state';
import type { DiscoverInternalState } from '../types';
import {
  fromSavedObjectTabToSavedSearch,
  fromTabStateToSavedObjectTab,
} from '../tab_mapping_utils';
import type { DiscoverServices } from '../../../../../build_services';
import { createSearchSource } from '../../utils/create_search_source';

export const selectTabSearchSource = (
  state: DiscoverInternalState,
  tabId: string,
  {
    runtimeStateManager,
    services,
  }: {
    runtimeStateManager: RuntimeStateManager;
    services: DiscoverServices;
  }
): ISearchSource => {
  const tabState = selectTab(state, tabId);
  const currentDataView = selectTabRuntimeState(
    runtimeStateManager,
    tabId
  ).currentDataView$.getValue();

  return createSearchSource({
    dataView: currentDataView,
    appState: tabState.appState,
    globalState: tabState.globalState,
    services,
  });
};

export const selectTabSavedSearch = async (
  state: DiscoverInternalState,
  tabId: string,
  {
    runtimeStateManager,
    services,
  }: {
    runtimeStateManager: RuntimeStateManager;
    services: DiscoverServices;
  }
): Promise<SavedSearch | undefined> => {
  const tabState = selectTab(state, tabId);
  const currentDataView = selectTabRuntimeState(
    runtimeStateManager,
    tabId
  ).currentDataView$.getValue();

  if (!currentDataView) {
    return undefined;
  }

  return fromSavedObjectTabToSavedSearch({
    tab: fromTabStateToSavedObjectTab({
      tab: tabState,
      dataView: currentDataView,
      services,
    }),
    discoverSession: undefined,
    services,
  });
};
