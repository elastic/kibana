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
): Promise<SavedSearch> => {
  const tabState = selectTab(state, tabId);
  const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);

  return fromSavedObjectTabToSavedSearch({
    tab: fromTabStateToSavedObjectTab({
      tab: tabState,
      tabRuntimeState,
      services,
    }),
    discoverSession: state.persistedDiscoverSession,
    services,
  });
};
