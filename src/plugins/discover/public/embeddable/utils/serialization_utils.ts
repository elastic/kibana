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

import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing';
import {
  SavedSearch,
  SavedSearchAttributes,
  toSavedSearchAttributes,
} from '@kbn/saved-search-plugin/common';
import { SavedSearchUnwrapResult } from '@kbn/saved-search-plugin/public';

import { extract, inject } from '../../../common/embeddable/search_inject_extract';
import { DiscoverServices } from '../../build_services';
import {
  EDITABLE_PANEL_KEYS,
  EDITABLE_SAVED_SEARCH_KEYS,
  SEARCH_EMBEDDABLE_TYPE,
} from '../constants';
import { SearchEmbeddableRuntimeState, SearchEmbeddableSerializedState } from '../types';

export const deserializeState = async ({
  serializedState,
  discoverServices,
}: {
  serializedState: SerializedPanelState<SearchEmbeddableSerializedState>;
  discoverServices: DiscoverServices;
}) => {
  const panelState = pick(serializedState.rawState, EDITABLE_PANEL_KEYS);
  const savedObjectId = serializedState.rawState.savedObjectId;
  if (savedObjectId) {
    // by reference
    const { get } = discoverServices.savedSearch;
    const so = await get(savedObjectId, true);

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
    };
  } else {
    // by value
    const { byValueToSavedSearch } = discoverServices.savedSearch;
    const savedSearch = await byValueToSavedSearch(
      inject(
        serializedState.rawState as unknown as EmbeddableStateWithType,
        serializedState.references ?? []
      ) as SavedSearchUnwrapResult,
      true
    );
    return {
      ...savedSearch,
      ...panelState,
    };
  }
};

export const serializeState = async ({
  uuid,
  initialState,
  savedSearch,
  serializeTitles,
  serializeTimeRange,
  savedObjectId,
  discoverServices,
}: {
  uuid: string;
  initialState: SearchEmbeddableRuntimeState;
  savedSearch: SavedSearch;
  serializeTitles: () => SerializedTitles;
  serializeTimeRange: () => SerializedTimeRange;
  savedObjectId?: string;
  discoverServices: DiscoverServices;
}): Promise<SerializedPanelState<SearchEmbeddableSerializedState>> => {
  const searchSource = savedSearch.searchSource;
  const { searchSourceJSON, references: originalReferences } = searchSource.serialize();
  const savedSearchAttributes = toSavedSearchAttributes(savedSearch, searchSourceJSON);

  if (savedObjectId) {
    const { get } = discoverServices.savedSearch;
    const so = await get(savedObjectId);

    // only save the current state that is **different** than the saved object state
    const overwriteState = EDITABLE_SAVED_SEARCH_KEYS.reduce((prev, key) => {
      if (deepEqual(savedSearchAttributes[key], so[key])) {
        return prev;
      }
      return { ...prev, [key]: savedSearchAttributes[key] };
    }, {});

    return {
      rawState: {
        savedObjectId,
        // Serialize the current dashboard state into the panel state **without** updating the saved object
        ...serializeTitles(),
        ...serializeTimeRange(),
        ...overwriteState,
      },
      // No references to extract for by-reference embeddable since all references are stored with by-reference saved object
      references: [],
    };
  }

  const { state, references } = extract({
    id: uuid,
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
      ...(state as unknown as SavedSearchAttributes),
    },
    references,
  };
};
