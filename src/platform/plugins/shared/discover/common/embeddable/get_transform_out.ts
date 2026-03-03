/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow, omit } from 'lodash';
import { extractTabs, SavedSearchType } from '@kbn/saved-search-plugin/common';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { SavedObjectReference } from '@kbn/core/server';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import type {
  SearchEmbeddableByReferenceState,
  SearchEmbeddableByValueState,
  StoredSearchEmbeddableByValueState,
  StoredSearchEmbeddableState,
} from './types';
import { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from './get_transform_in';

function isByValue(
  state: StoredSearchEmbeddableState
): state is StoredSearchEmbeddableByValueState {
  return (
    typeof (state as StoredSearchEmbeddableByValueState).attributes === 'object' &&
    (state as StoredSearchEmbeddableByValueState).attributes !== null
  );
}

export function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(
    storedState: StoredSearchEmbeddableState,
    references?: SavedObjectReference[]
  ) {
    const transformsFlow = flow(
      transformTitlesOut<StoredSearchEmbeddableState>,
      (state: StoredSearchEmbeddableState) => transformDrilldownsOut(state, references)
    );
    const state = transformsFlow(storedState);

    if (isByValue(state)) {
      const tabsState = { ...state, attributes: extractTabs(state.attributes) };
      const tabs = tabsState.attributes.tabs.map((tab) => {
        try {
          const searchSourceValues = parseSearchSourceJSON(
            tab.attributes.kibanaSavedObjectMeta.searchSourceJSON
          );
          const searchSourceFields = injectReferences(searchSourceValues, references ?? []);
          return {
            ...tab,
            attributes: {
              ...omit(tab.attributes, 'references'),
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

      return {
        ...state,
        attributes: {
          ...state.attributes,
          tabs,
        },
      } as SearchEmbeddableByValueState;
    }

    const savedObjectRef = (references ?? []).find(
      (ref) => SavedSearchType === ref.type && ref.name === SAVED_SEARCH_SAVED_OBJECT_REF_NAME
    );
    return {
      ...state,
      ...(savedObjectRef?.id ? { savedObjectId: savedObjectRef.id } : {}),
    } as SearchEmbeddableByReferenceState;
  }
  return transformOut;
}
