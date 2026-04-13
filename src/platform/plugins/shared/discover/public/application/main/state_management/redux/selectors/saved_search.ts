/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { selectTab } from './tabs';
import { selectTabRuntimeState, type RuntimeStateManager } from '../runtime_state';
import type { DiscoverInternalState } from '../types';
import {
  fromSavedObjectTabToSavedSearch,
  fromTabStateToSavedObjectTab,
} from '../tab_mapping_utils';
import type { DiscoverServices } from '../../../../../build_services';

export const selectTabSavedSearch = async ({
  tabId,
  getState,
  runtimeStateManager,
  services,
}: {
  tabId: string;
  getState: () => DiscoverInternalState;
  runtimeStateManager: RuntimeStateManager;
  services: DiscoverServices;
}): Promise<SavedSearch> => {
  const currentState = getState();
  const tabState = selectTab(currentState, tabId);
  const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
  const currentDataView = tabRuntimeState?.currentDataView$.getValue();

  return fromSavedObjectTabToSavedSearch({
    tab: fromTabStateToSavedObjectTab({
      tab: tabState,
      currentDataView,
      services,
    }),
    discoverSession: currentState.persistedDiscoverSession,
    services,
  });
};
