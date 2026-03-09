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
import { type SerializedTimeRange, type SerializedTitles } from '@kbn/presentation-publishing';
import {
  type SavedSearch,
  SavedSearchType,
  toSavedSearchAttributes,
} from '@kbn/saved-search-plugin/common';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import {
  byReferenceSavedSearchToDiscoverSessionEmbeddableState,
  byValueDiscoverSessionToSavedSearchEmbeddableState,
  byValueSavedSearchToDiscoverSessionEmbeddableState,
  toStoredSearchEmbeddableState,
} from '../../../common/embeddable/transform_utils';
import { isByReferenceDiscoverSessionEmbeddableState } from '../../../common';
import {
  EDITABLE_SAVED_SEARCH_KEYS,
  SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
} from '../../../common/embeddable/constants';
import type {
  EditableSavedSearchAttributes,
  StoredSearchEmbeddableByReferenceState,
  StoredSearchEmbeddableState,
} from '../../../common/embeddable/types';
import type { DiscoverSessionEmbeddableState } from '../../../server';
import type { DiscoverServices } from '../../build_services';
import { EDITABLE_PANEL_KEYS } from '../constants';
import type { SearchEmbeddableInputState, SearchEmbeddableRuntimeState } from '../types';
import { isTabDeleted } from './is_tab_deleted';

export const deserializeState = async ({
  serializedState,
  discoverServices,
}: {
  serializedState: SearchEmbeddableInputState;
  discoverServices: DiscoverServices;
}): Promise<SearchEmbeddableRuntimeState> => {
  const panelState = pick(serializedState, EDITABLE_PANEL_KEYS);
  const savedObjectOverride = toStoredSearchEmbeddableState(serializedState);

  if (isByReferenceDiscoverSessionEmbeddableState(serializedState)) {
    // by reference
    const { getDiscoverSession } = discoverServices.savedSearch;
    const session = await getDiscoverSession(serializedState.discover_session_id);

    const selectedTabId = serializedState.selected_tab_id;
    const selectedTab = selectedTabId
      ? session.tabs.find((t) => t.id === selectedTabId)
      : undefined;
    const resolvedTab = selectedTab ?? session.tabs[0];
    const isSelectedTabDeleted = Boolean(selectedTabId && !selectedTab);
    const resolvedSelectedTabId = isSelectedTabDeleted ? selectedTabId : resolvedTab?.id;

    // Build runtime state from the resolved tab's attributes
    // ignore the time range from the tab - only global time range + panel time range matter
    const runtimeSavedSearchState = isSelectedTabDeleted
      ? {}
      : { ...omit(resolvedTab, 'timeRange'), ...savedObjectOverride };

    return {
      ...runtimeSavedSearchState,
      savedObjectId: serializedState.discover_session_id,
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

    const { state: storedState, references } =
      byValueDiscoverSessionToSavedSearchEmbeddableState(serializedState);
    const savedSearch = await byValueToSavedSearch(
      { attributes: { ...storedState.attributes, references } },
      true
    );

    const { tabs, ...savedSearchWithoutTabs } = savedSearch;

    return {
      ...savedSearchWithoutTabs,
      ...panelState,
      ...savedObjectOverride,
      nonPersistedDisplayOptions: serializedState.nonPersistedDisplayOptions,
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
}): DiscoverSessionEmbeddableState => {
  const searchSource = savedSearch.searchSource;
  const searchSourceJSON = JSON.stringify(searchSource.getSerializedFields());
  const savedSearchAttributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);

  if (savedObjectId) {
    const isSelectedTabDeleted = isTabDeleted(selectedTabId, initialState.tabs ?? []);

    const selectedTab = selectedTabId
      ? initialState.tabs?.find((tab) => tab.id === selectedTabId)
      : undefined;

    let overwriteState: EditableSavedSearchAttributes;

    if (isSelectedTabDeleted || !selectedTab) {
      overwriteState = pick(initialState, EDITABLE_SAVED_SEARCH_KEYS);
    } else {
      const editableAttributesBackup = pick(selectedTab, EDITABLE_SAVED_SEARCH_KEYS);
      const [{ attributes }] = savedSearchAttributes.tabs;

      // only save the current state that is **different** than the saved object state
      overwriteState = EDITABLE_SAVED_SEARCH_KEYS.reduce((prev, key) => {
        if (deepEqual(attributes[key], editableAttributesBackup[key])) {
          return prev;
        }
        return { ...prev, [key]: attributes[key] };
      }, {});
    }

    const storedByRef: StoredSearchEmbeddableByReferenceState = {
      ...serializeTitles(),
      ...serializeTimeRange(),
      ...serializeDynamicActions?.(),
      ...overwriteState,
      ...(selectedTabId !== undefined && { selectedTabId }),
    };
    const refs = [
      { name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME, type: SavedSearchType, id: savedObjectId },
    ];
    return byReferenceSavedSearchToDiscoverSessionEmbeddableState(storedByRef, refs);
  }

  const stored: StoredSearchEmbeddableState = {
    ...serializeTitles(),
    ...serializeTimeRange(),
    ...serializeDynamicActions?.(),
    attributes: savedSearchAttributes,
  };
  return byValueSavedSearchToDiscoverSessionEmbeddableState(stored, []);
};
