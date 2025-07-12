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
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import {
  type SerializedTimeRange,
  type SerializedTitles,
  type SerializedPanelState,
  findSavedObjectRef,
  SAVED_OBJECT_REF_NAME,
} from '@kbn/presentation-publishing';
import {
  toSavedSearchAttributes,
  type SavedSearch,
  type SavedSearchAttributes,
} from '@kbn/saved-search-plugin/common';
import type { SavedSearchUnwrapResult } from '@kbn/saved-search-plugin/public';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import { extract, inject } from '../../../common/embeddable/search_inject_extract';
import type { DiscoverServices } from '../../build_services';
import {
  EDITABLE_PANEL_KEYS,
  EDITABLE_SAVED_SEARCH_KEYS,
  SEARCH_EMBEDDABLE_TYPE,
} from '../constants';
import type { SearchEmbeddableRuntimeState, SearchEmbeddableSerializedState } from '../types';

export const deserializeState = async ({
  serializedState,
  discoverServices,
}: {
  serializedState: SerializedPanelState<SearchEmbeddableSerializedState>;
  discoverServices: DiscoverServices;
}): Promise<SearchEmbeddableRuntimeState> => {
  const panelState = pick(serializedState.rawState, EDITABLE_PANEL_KEYS);
  const savedObjectRef = findSavedObjectRef(SEARCH_EMBEDDABLE_TYPE, serializedState.references);
  const savedObjectId = savedObjectRef ? savedObjectRef.id : serializedState.rawState.savedObjectId;
  if (savedObjectId) {
    // by reference
    const { get } = discoverServices.savedSearch;
    const so = await get(savedObjectId, true);

    const rawSavedObjectAttributes = pick(so, EDITABLE_SAVED_SEARCH_KEYS);
    const savedObjectOverride = pick(serializedState.rawState, EDITABLE_SAVED_SEARCH_KEYS);
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
    const savedSearchUnwrappedResult = inject(
      serializedState.rawState as unknown as EmbeddableStateWithType,
      serializedState.references ?? []
    ) as SavedSearchUnwrapResult;

    const savedSearch = await byValueToSavedSearch(savedSearchUnwrappedResult, true);
    return {
      ...savedSearch,
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
  savedObjectId,
}: {
  uuid: string;
  initialState: SearchEmbeddableRuntimeState;
  savedSearch: SavedSearch;
  serializeTitles: () => SerializedTitles;
  serializeTimeRange: () => SerializedTimeRange;
  serializeDynamicActions: (() => SerializedPanelState<DynamicActionsSerializedState>) | undefined;
  savedObjectId?: string;
}): SerializedPanelState<SearchEmbeddableSerializedState> => {
  const searchSource = savedSearch.searchSource;
  const { searchSourceJSON, references: originalReferences } = searchSource.serialize();
  const savedSearchAttributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);

  const { rawState: dynamicActionsState, references: dynamicActionsReferences } =
    serializeDynamicActions?.() ?? {};

  if (savedObjectId) {
    const editableAttributesBackup = initialState.rawSavedObjectAttributes ?? {};

    // only save the current state that is **different** than the saved object state
    const overwriteState = EDITABLE_SAVED_SEARCH_KEYS.reduce((prev, key) => {
      if (deepEqual(savedSearchAttributes[key], editableAttributesBackup[key])) {
        return prev;
      }
      return { ...prev, [key]: savedSearchAttributes[key] };
    }, {});

    return {
      rawState: {
        // Serialize the current dashboard state into the panel state **without** updating the saved object
        ...serializeTitles(),
        ...serializeTimeRange(),
        ...dynamicActionsState,
        ...overwriteState,
      },
      references: [
        ...(dynamicActionsReferences ?? []),
        {
          name: SAVED_OBJECT_REF_NAME,
          type: SEARCH_EMBEDDABLE_TYPE,
          id: savedObjectId,
        },
      ],
    };
  }

  const { state, references } = extract({
    type: SEARCH_EMBEDDABLE_TYPE,
    attributes: {
      ...savedSearchAttributes,
      references: originalReferences,
    },
  });

  return {
    rawState: {
      ...serializeTitles(),
      ...serializeTimeRange(),
      ...dynamicActionsState,
      ...(state as unknown as SavedSearchAttributes),
    },
    references: [...references, ...(dynamicActionsReferences ?? [])],
  };
};
