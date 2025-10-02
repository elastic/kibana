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
import type { SearchEmbeddableSerializedState, StoredSearchEmbeddableState } from './types';
import { isByRefState, isByValueState } from './helpers';
import { extract } from './search_inject_extract';

export const SAVED_SEARCH_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

export function getTransformIn(transformEnhancementsIn: EnhancementsRegistry['transformIn']) {
  function transformIn(state: SearchEmbeddableSerializedState): {
    state: StoredSearchEmbeddableState;
    references: SavedObjectReference[];
  } {
    const { enhancementsState, enhancementsReferences } = state.enhancements
      ? transformEnhancementsIn(state.enhancements)
      : { enhancementsState: undefined, enhancementsReferences: [] };

    if (isByRefState(state)) {
      const { savedObjectId, ...rest } = state;
      return {
        state: {
          ...rest,
          ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        },
        references: [
          {
            name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
            type: SavedSearchType,
            id: savedObjectId!,
          },
          ...enhancementsReferences,
        ],
      };
    }

    if (isByValueState(state)) {
      const { state: extractedState, references } = extract({
        type: 'search',
        attributes: state.attributes,
      });

      return {
        state: {
          ...state,
          attributes: {
            ...state.attributes,
            ...extractedState,
            // discover session stores references as part of attributes
            references,
          },
        },
        references: [...references, ...enhancementsReferences],
      };
    }
    return {
      state: {
        ...state,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
      },
      references: enhancementsReferences,
    };
  }
  return transformIn;
}
