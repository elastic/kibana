/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit, pick } from 'lodash';
import { type SerializedTimeRange, type SerializedTitles } from '@kbn/presentation-publishing';
import { toSavedSearchAttributes, type SavedSearch } from '@kbn/saved-search-plugin/common';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
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
  serializedState: SearchEmbeddableState;
  discoverServices: DiscoverServices;
}): Promise<SearchEmbeddableRuntimeState> => {
  const panelState = pick(serializedState, EDITABLE_PANEL_KEYS);
  const savedObjectId = (serializedState as SearchEmbeddableByReferenceState).savedObjectId;
  if (savedObjectId) {
    // by reference
    const { getDiscoverSession } = discoverServices.savedSearch;
    const session = await getDiscoverSession(savedObjectId);

    const selectedTabId = (serializedState as SearchEmbeddableByReferenceState).selectedTabId;
    const selectedTab = selectedTabId
      ? session.tabs.find((t) => t.id === selectedTabId)
      : undefined;

    const resolvedTab = selectedTab ?? session.tabs[0];

    const isSelectedTabDeleted = Boolean(selectedTabId && !selectedTab);

    const resolvedSelectedTabId = isSelectedTabDeleted ? selectedTabId : resolvedTab?.id;

    // Build runtime state from the resolved tab's attributes
    // ignore the time range from the tab - only global time range + panel time range matter
    const runtimeSavedSearchState = isSelectedTabDeleted ? {} : omit(resolvedTab, 'timeRange');

    return {
      ...runtimeSavedSearchState,
      savedObjectId,
      savedObjectTitle: session.title,
      savedObjectDescription: session.description,
      selectedTabId: resolvedSelectedTabId,
      tabs: session.tabs,

      // Overwrite SO state with dashboard state for title, description, etc.
      ...panelState,
    };
  } else {
    // by value
    const { byValueToSavedSearch } = discoverServices.savedSearch;

    const savedSearch = await byValueToSavedSearch(
      serializedState as SearchEmbeddableByValueState,
      true
    );

    const { tabs, ...savedSearchWithoutTabs } = savedSearch;

    return {
      ...savedSearchWithoutTabs,
      ...panelState,
      nonPersistedDisplayOptions: serializedState.nonPersistedDisplayOptions,
    };
  }
};

export const serializeState = ({
  uuid: _uuid,
  initialState: _initialState,
  savedSearch,
  serializeTitles,
  serializeTimeRange,
  serializeDynamicActions,
  savedObjectId,
  selectedTabId,
}: {
  uuid: string;
  initialState: SearchEmbeddableRuntimeState;
  savedSearch: SavedSearch;
  serializeTitles: () => SerializedTitles;
  serializeTimeRange: () => SerializedTimeRange;
  serializeDynamicActions: () => SerializedDrilldowns;
  savedObjectId?: string;
  selectedTabId?: string;
}): SearchEmbeddableState => {
  if (savedObjectId) {
    return {
      ...serializeTitles(),
      ...serializeTimeRange(),
      ...serializeDynamicActions?.(),
      savedObjectId,
      ...(selectedTabId ? { selectedTabId } : {}),
    };
  }

  const searchSource = savedSearch.searchSource;
  const searchSourceJSON = JSON.stringify(searchSource.getSerializedFields());
  const savedSearchAttributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);

  return {
    ...serializeTitles(),
    ...serializeTimeRange(),
    ...serializeDynamicActions?.(),
    attributes: savedSearchAttributes,
  };
};
