/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionTab as StoredDiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionSanitizeRequest } from '../../../../../../server';
import type { DiscoverServices } from '../../../../../build_services';
import {
  fromTabStateToSavedObjectTab,
  selectAllTabs,
  selectTab,
  selectTabRuntimeState,
  selectTabTypeForPersistence,
  TabInitializationStatus,
  type DiscoverInternalState,
  type RuntimeStateManager,
} from '../../../state_management/redux';

// Moves the serialized search source into the Saved Object tab shape expected by the sanitizer.
const getStoredTab = (
  tab: StoredDiscoverSessionTab
): DiscoverSessionSanitizeRequest['attributes']['tabs'][number] => {
  const { id, label, serializedSearchSource, ...storedAttributes } = tab;

  return {
    id,
    label,
    attributes: {
      ...storedAttributes,
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(serializedSearchSource),
      },
    },
  };
};

/** Builds the current Discover session state for conversion to the public API format. */
export const buildDiscoverSessionExportRequest = ({
  getState,
  runtimeStateManager,
  services,
  includeCurrentTimeSettings,
  tabId,
  title,
}: {
  getState: () => DiscoverInternalState;
  runtimeStateManager: RuntimeStateManager;
  services: DiscoverServices;
  includeCurrentTimeSettings?: boolean;
  tabId?: string;
  title: string;
}): DiscoverSessionSanitizeRequest => {
  const state = getState();
  const allTabs = selectAllTabs(state);
  const tabs = tabId ? [selectTab(state, tabId)] : allTabs;
  const selectedTab = allTabs.find((tab) => tab.id === state.tabs.unsafeCurrentId);
  const storedTabs = tabs.map((tab) => {
    const currentDataView = selectTabRuntimeState(
      runtimeStateManager,
      tab.id
    )?.currentDataView$.getValue();

    const storedTab = fromTabStateToSavedObjectTab({
      tab,
      currentDataView,
      overridenTimeRestore: includeCurrentTimeSettings,
      services,
      tabType: selectTabTypeForPersistence({ runtimeStateManager, tabState: tab }),
    });

    if (
      tab.initializationState.initializationStatus === TabInitializationStatus.NotStarted &&
      includeCurrentTimeSettings &&
      !storedTab.timeRange &&
      selectedTab?.globalState.timeRange
    ) {
      storedTab.timeRange = selectedTab.globalState.timeRange;
      storedTab.refreshInterval = selectedTab.globalState.refreshInterval;
    }

    if (tab.overriddenVisContextAfterInvalidation) {
      storedTab.visContext = tab.overriddenVisContextAfterInvalidation;
    }

    return getStoredTab(storedTab);
  });

  return {
    attributes: {
      title,
      description: state.persistedDiscoverSession?.description ?? '',
      tabs: storedTabs,
    },
    tags: state.persistedDiscoverSession?.tags,
  };
};
