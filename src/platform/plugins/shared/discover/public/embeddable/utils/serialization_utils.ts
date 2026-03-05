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
import { toSavedSearchAttributes, type SavedSearch } from '@kbn/saved-search-plugin/common';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import {
  byReferenceSavedSearchToDiscoverSessionEmbeddableState,
  byValueDiscoverSessionToSavedSearchEmbeddableState,
  byValueSavedSearchToDiscoverSessionEmbeddableState,
  toStoredSearchEmbeddableState,
} from '../../../common/embeddable/transform_utils';
import { isByReferenceDiscoverSessionEmbeddableState } from '../../../common';
import { EDITABLE_SAVED_SEARCH_KEYS } from '../../../common/embeddable/constants';
import { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from '../../../common/embeddable/constants';
import type {
  StoredSearchEmbeddableByReferenceState,
  StoredSearchEmbeddableState,
} from '../../../common/embeddable/types';
import type { DiscoverSessionEmbeddableState } from '../../../server';
import type { DiscoverServices } from '../../build_services';
import { EDITABLE_PANEL_KEYS } from '../constants';
import type { SearchEmbeddableInputState, SearchEmbeddableRuntimeState } from '../types';

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
    const { get } = discoverServices.savedSearch;
    const so = await get(serializedState.discover_session_id, true);

    const rawSavedObjectAttributes = pick(so, EDITABLE_SAVED_SEARCH_KEYS);
    return {
      // ignore the time range from the saved object - only global time range + panel time range matter
      ...omit(so, 'timeRange'),
      savedObjectId: serializedState.discover_session_id,
      savedObjectTitle: so.title,
      savedObjectDescription: so.description,
      // Overwrite SO state with dashboard state for title, description, columns, sort, etc.
      ...panelState,
      ...savedObjectOverride,
      nonPersistedDisplayOptions: serializedState.nonPersistedDisplayOptions,

      // back up the original saved object attributes for comparison
      rawSavedObjectAttributes,
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
    return {
      ...savedSearch,
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
}: {
  uuid: string;
  initialState: SearchEmbeddableRuntimeState;
  savedSearch: SavedSearch;
  serializeTitles: () => SerializedTitles;
  serializeTimeRange: () => SerializedTimeRange;
  serializeDynamicActions: () => SerializedDrilldowns;
  savedObjectId?: string;
}): DiscoverSessionEmbeddableState => {
  const searchSource = savedSearch.searchSource;
  const searchSourceJSON = JSON.stringify(searchSource.getSerializedFields());
  const savedSearchAttributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);

  if (savedObjectId) {
    const editableAttributesBackup = initialState.rawSavedObjectAttributes ?? {};
    const [{ attributes }] = savedSearchAttributes.tabs;

    // only save the current state that is **different** than the saved object state
    const overwriteState = EDITABLE_SAVED_SEARCH_KEYS.reduce((prev, key) => {
      if (deepEqual(attributes[key], editableAttributesBackup[key])) {
        return prev;
      }
      return { ...prev, [key]: attributes[key] };
    }, {});

    const storedByRef: StoredSearchEmbeddableByReferenceState = {
      ...serializeTitles(),
      ...serializeTimeRange(),
      ...serializeDynamicActions?.(),
      ...overwriteState,
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
