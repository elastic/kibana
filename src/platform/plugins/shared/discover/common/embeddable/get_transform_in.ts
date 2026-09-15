/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { extractReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from './constants';
import { isSearchEmbeddableByValueState, isSearchEmbeddableLegacyPanelState } from './type_guards';
import { toStoredSearchEmbeddable } from './transform_utils';
import type {
  SearchEmbeddablePanelApiState,
  SearchEmbeddableState,
  StoredSearchEmbeddableState,
} from './types';

export function getTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']) {
  return function transformIn(apiState: SearchEmbeddablePanelApiState): {
    state: StoredSearchEmbeddableState;
    references: SavedObjectReference[];
  } {
    const { state, references } = transformDrilldownsIn(apiState);
    return isSearchEmbeddableLegacyPanelState(state)
      ? legacyTransformIn(state, references)
      : toStoredSearchEmbeddable(state, references);
  };
}

function legacyTransformIn(
  storedState: SearchEmbeddableState,
  drilldownReferences: SavedObjectReference[] = []
): { state: StoredSearchEmbeddableState; references: SavedObjectReference[] } {
  if (!isSearchEmbeddableByValueState(storedState)) {
    const { savedObjectId, ...rest } = storedState;
    return {
      state: rest,
      references: [
        {
          name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
          type: SavedSearchType,
          id: savedObjectId,
        },
        ...drilldownReferences,
      ],
    };
  }

  // by value
  const tabReferences: SavedObjectReference[] = [];
  const tabs = storedState.attributes.tabs.map((tab) => {
    try {
      const searchSourceValues = parseSearchSourceJSON(
        tab.attributes.kibanaSavedObjectMeta.searchSourceJSON
      );
      const [searchSourceFields, searchSourceReferences] = extractReferences(searchSourceValues);
      tabReferences.push(...searchSourceReferences);
      return {
        ...tab,
        attributes: {
          ...tab.attributes,
          kibanaSavedObjectMeta: {
            ...tab.attributes.kibanaSavedObjectMeta,
            searchSourceJSON: JSON.stringify(searchSourceFields),
          },
        },
      };
    } catch (e) {
      return tab;
    }
  });

  const { references = [], ...otherAttrs } = storedState.attributes;
  return {
    state: {
      ...storedState,
      attributes: {
        ...otherAttrs,
        tabs,
      },
    },
    references: [...references, ...tabReferences, ...drilldownReferences],
  };
}
