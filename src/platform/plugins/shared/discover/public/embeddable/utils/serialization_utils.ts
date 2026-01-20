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
  serializedState: SearchEmbeddableState;
  discoverServices: DiscoverServices;
}): Promise<SearchEmbeddableRuntimeState> => {
  const panelState = pick(serializedState, EDITABLE_PANEL_KEYS);
  const savedObjectId = (serializedState as SearchEmbeddableByReferenceState).savedObjectId;
  if (savedObjectId) {
    // by reference
    const { get } = discoverServices.savedSearch;
    const so = await get(savedObjectId, true);

    const rawSavedObjectAttributes = pick(so, EDITABLE_SAVED_SEARCH_KEYS);
    const savedObjectOverride = pick(serializedState, EDITABLE_SAVED_SEARCH_KEYS);
    return {
      // ignore the time range from the saved object - only global time range + panel time range matter
      ...omit(so, 'timeRange'),
      savedObjectId,
      savedObjectTitle: so.title,
      savedObjectDescription: so.description,
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
      serializedState as SearchEmbeddableByValueState,
      true
    );
    return {
      ...savedSearch,
      ...panelState,
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
  serializeDynamicActions: (() => DynamicActionsSerializedState) | undefined;
  savedObjectId?: string;
}): SearchEmbeddableState => {
  const searchSource = savedSearch.searchSource;
  const { searchSourceJSON, references: originalReferences } = searchSource.serialize();
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

    return {
      // Serialize the current dashboard state into the panel state **without** updating the saved object
      ...serializeTitles(),
      ...serializeTimeRange(),
      ...serializeDynamicActions?.(),
      ...overwriteState,
      savedObjectId,
    };
  }

  const state = {
    attributes: {
      ...savedSearchAttributes,
      references: originalReferences,
    },
  };

  return {
    ...serializeTitles(),
    ...serializeTimeRange(),
    ...serializeDynamicActions?.(),
    ...state,
  };
};
