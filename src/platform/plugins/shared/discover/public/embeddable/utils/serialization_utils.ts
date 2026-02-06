/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit, pick } from 'lodash';
import deepEqual from 'react-fast-compare';
import {
  type SerializedTimeRange,
  type SerializedTitles,
  type SerializedPanelState,
} from '@kbn/presentation-publishing';
import { toSavedSearchAttributes, type SavedSearch } from '@kbn/saved-search-plugin/common';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import { EDITABLE_SAVED_SEARCH_KEYS } from '../../../common/embeddable/constants';
import type {
  SearchEmbeddableByReferenceState,
  SearchEmbeddableByValueState,
  SearchEmbeddableState,
} from '../../../common/embeddable/types';
import type { DiscoverServices } from '../../build_services';
import { EDITABLE_PANEL_KEYS } from '../constants';
import type { SearchEmbeddableRuntimeState } from '../types';

export const deserializeState = async ({
  serializedState,
  discoverServices,
}: {
  serializedState: SerializedPanelState<SearchEmbeddableState>;
  discoverServices: DiscoverServices;
}): Promise<SearchEmbeddableRuntimeState> => {
  const panelState = pick(serializedState.rawState, EDITABLE_PANEL_KEYS);
  const savedObjectId = (serializedState.rawState as SearchEmbeddableByReferenceState)
    .savedObjectId;
  if (savedObjectId) {
    // by reference
    const session = await discoverServices.savedSearch.getDiscoverSession(savedObjectId);

    const savedSelectedTabId = (serializedState.rawState as SearchEmbeddableByReferenceState)
      .selectedTabId;
    const foundTab = savedSelectedTabId
      ? session.tabs.find((tab) => tab.id === savedSelectedTabId)
      : undefined;

    const selectedTab = foundTab ?? session.tabs[0];
    const selectedTabNotFound = Boolean(savedSelectedTabId && !foundTab);

    const selectedTabId = savedSelectedTabId ?? selectedTab.id;

    const rawSavedObjectAttributes = pick(selectedTab, EDITABLE_SAVED_SEARCH_KEYS);

    rawSavedObjectAttributes.sort = rawSavedObjectAttributes.sort ?? [];
    rawSavedObjectAttributes.columns = rawSavedObjectAttributes.columns ?? [];
    rawSavedObjectAttributes.grid = rawSavedObjectAttributes.grid ?? {};

    const savedObjectOverrideFromState = pick(serializedState.rawState, EDITABLE_SAVED_SEARCH_KEYS);

    const savedObjectOverride = selectedTabNotFound ? {} : savedObjectOverrideFromState;
    const deletedTabOverrides = selectedTabNotFound ? savedObjectOverrideFromState : undefined;

    return {
      // ignore the time range from the saved object - only global time range + panel time range matter
      ...omit(selectedTab, 'timeRange'),
      savedObjectId,
      savedObjectTitle: session.title,
      savedObjectDescription: session.description,
      tabs: session.tabs,
      selectedTabId,
      selectedTabNotFound,
      deletedTabOverrides,

      // Overwrite SO state with dashboard state for title, description, columns, sort, etc.
      ...panelState,
      ...savedObjectOverride,

      // back up the original saved object attributes for comparison
      rawSavedObjectAttributes,
    };
  } else {
    // by value
    const { byValueToSavedSearch } = discoverServices.savedSearch;

    const savedSearch = await byValueToSavedSearch(
      serializedState.rawState as SearchEmbeddableByValueState,
      true
    );
    const { tabs: _tabs, ...savedSearchWithoutTabs } = savedSearch;

    return {
      ...savedSearchWithoutTabs,
      ...panelState,
      nonPersistedDisplayOptions: serializedState.rawState.nonPersistedDisplayOptions,
    };
  }
};

export const serializeState = ({
  uuid,
  initialState,
  savedSearch,
  serializeTitles,
  serializeTimeRange,
  serializeDynamicActions,
  selectedTabId,
  savedObjectId,
}: {
  uuid: string;
  initialState: SearchEmbeddableRuntimeState;
  savedSearch: SavedSearch;
  serializeTitles: () => SerializedTitles;
  serializeTimeRange: () => SerializedTimeRange;
  serializeDynamicActions: (() => DynamicActionsSerializedState) | undefined;
  selectedTabId?: string;
  savedObjectId?: string;
}): SerializedPanelState<SearchEmbeddableState> => {
  const searchSource = savedSearch.searchSource;
  const { searchSourceJSON, references: originalReferences } = searchSource.serialize();
  const savedSearchAttributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);

  if (savedObjectId) {
    const editableAttributesBackup = initialState.rawSavedObjectAttributes ?? {};

    const firstTab = savedSearchAttributes.tabs?.[0];
    const attributes = firstTab?.attributes ?? savedSearchAttributes;

    const useDeletedTabOverrides =
      initialState.deletedTabOverrides !== undefined &&
      selectedTabId === initialState.selectedTabId;

    const overwriteState = useDeletedTabOverrides
      ? initialState.deletedTabOverrides
      : EDITABLE_SAVED_SEARCH_KEYS.reduce((prev, key) => {
          if (deepEqual(attributes[key], editableAttributesBackup[key])) {
            return prev;
          }
          return { ...prev, [key]: attributes[key] };
        }, {});

    const tabState = selectedTabId ? { selectedTabId } : {};

    return {
      rawState: {
        // Serialize the current dashboard state into the panel state **without** updating the saved object
        ...serializeTitles(),
        ...serializeTimeRange(),
        ...serializeDynamicActions?.(),
        ...overwriteState,
        ...tabState,
        savedObjectId,
      },
      references: [],
    };
  }

  const state = {
    attributes: {
      ...savedSearchAttributes,
      references: originalReferences,
    },
  };

  return {
    rawState: {
      ...serializeTitles(),
      ...serializeTimeRange(),
      ...serializeDynamicActions?.(),
      ...state,
    },
    references: [],
  };
};
