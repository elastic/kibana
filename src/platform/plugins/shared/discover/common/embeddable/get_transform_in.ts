/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type {
  SearchEmbeddableByReferenceState,
  SearchEmbeddableState,
  StoredSearchEmbeddableState,
} from './types';
import { extract } from './search_inject_extract';

export const SAVED_SEARCH_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

function isByRefState(state: SearchEmbeddableState): state is SearchEmbeddableByReferenceState {
  return 'savedObjectId' in state;
}

export function getTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']) {
  function transformIn(state: SearchEmbeddableState): {
    state: StoredSearchEmbeddableState;
    references: SavedObjectReference[];
  } {
    const { state: storedState, references: drilldownReferences } =
      transformDrilldownsIn<SearchEmbeddableState>(state);

    if (isByRefState(storedState)) {
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
    const { state: extractedState, references } = extract({
      type: SavedSearchType,
      attributes: storedState.attributes,
    });

    return {
      state: {
        ...storedState,
        attributes: {
          ...storedState.attributes,
          ...extractedState.attributes,
          // discover session stores references as part of attributes
          references,
        },
      },
      references: [...references, ...drilldownReferences],
    };
  }
  return transformIn;
}
