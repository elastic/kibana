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
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type {
  SearchEmbeddableByReferenceState,
  SearchEmbeddableState,
  StoredSearchEmbeddableByReferenceState,
  StoredSearchEmbeddableByValueState,
  StoredSearchEmbeddableState,
} from './types';
import { extract } from './search_inject_extract';

export const SAVED_SEARCH_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

function isByRefState(state: SearchEmbeddableState): state is SearchEmbeddableByReferenceState {
  return 'savedObjectId' in state;
}

export function getTransformIn(
  transformEnhancementsIn: EmbeddableSetup['transformEnhancementsIn']
) {
  function transformIn(state: SearchEmbeddableState): {
    state: StoredSearchEmbeddableState;
    references: SavedObjectReference[];
  } {
    const enhancementsResult = state.enhancements
      ? transformEnhancementsIn(state.enhancements)
      : { state: undefined, references: [] };

    if (isByRefState(state)) {
      const { savedObjectId, ...rest } = state;
      return {
        state: {
          ...rest,
          ...(enhancementsResult.state
            ? {
                enhancements:
                  enhancementsResult.state as StoredSearchEmbeddableByReferenceState['enhancements'],
              }
            : {}),
        },
        references: [
          {
            name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
            type: SavedSearchType,
            id: savedObjectId,
          },
          ...enhancementsResult.references,
        ],
      };
    }

    // by value
    const { state: extractedState, references } = extract({
      type: SavedSearchType,
      attributes: state.attributes,
    });

    return {
      state: {
        ...state,
        ...(enhancementsResult.state
          ? {
              enhancements:
                enhancementsResult.state as StoredSearchEmbeddableByValueState['enhancements'],
            }
          : {}),
        attributes: {
          ...state.attributes,
          ...extractedState.attributes,
          // discover session stores references as part of attributes
          references,
        },
      },
      references: [...references, ...enhancementsResult.references],
    };
  }
  return transformIn;
}
