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
import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import { transformTitlesIn } from '@kbn/presentation-publishing';
import type {
  SearchEmbeddableByReferenceState,
  SearchEmbeddableState,
  StoredSearchEmbeddableByReferenceState,
  StoredSearchEmbeddableByValueState,
  StoredSearchEmbeddableState,
} from './types';
import { extract } from './search_inject_extract';

export const SAVED_SEARCH_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

function isByRefState(state: object): state is SearchEmbeddableByReferenceState {
  return 'savedObjectId' in state;
}

export function getTransformIn(transformEnhancementsIn: EnhancementsRegistry['transformIn']) {
  function transformIn(state: SearchEmbeddableState): {
    state: StoredSearchEmbeddableState;
    references: SavedObjectReference[];
  } {
    const stateWithStoredTitles = transformTitlesIn(state);

    const { enhancementsState, enhancementsReferences } = stateWithStoredTitles.enhancements
      ? transformEnhancementsIn(stateWithStoredTitles.enhancements)
      : { enhancementsState: undefined, enhancementsReferences: [] };

    if (isByRefState(stateWithStoredTitles)) {
      const { savedObjectId, ...rest } = stateWithStoredTitles;
      return {
        state: {
          ...rest,
          ...(enhancementsState
            ? {
                enhancements:
                  enhancementsState as StoredSearchEmbeddableByReferenceState['enhancements'],
              }
            : {}),
        },
        references: [
          {
            name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
            type: SavedSearchType,
            id: savedObjectId,
          },
          ...enhancementsReferences,
        ],
      };
    }

    // by value
    const { state: extractedState, references } = extract({
      type: SavedSearchType,
      attributes: (stateWithStoredTitles as StoredSearchEmbeddableByValueState).attributes,
    });

    return {
      state: {
        ...stateWithStoredTitles,
        ...(enhancementsState
          ? {
              enhancements: enhancementsState as StoredSearchEmbeddableByValueState['enhancements'],
            }
          : {}),
        attributes: {
          ...(stateWithStoredTitles as StoredSearchEmbeddableByValueState).attributes,
          ...extractedState.attributes,
          // discover session stores references as part of attributes
          references,
        },
      },
      references: [...references, ...enhancementsReferences],
    };
  }
  return transformIn;
}
