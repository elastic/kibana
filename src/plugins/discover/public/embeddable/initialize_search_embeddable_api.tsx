/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import deepEqual from 'react-fast-compare';

import type { StateComparators } from '@kbn/presentation-publishing';
import { SavedSearchByValueAttributes } from '@kbn/saved-search-plugin/public';

import { SearchEmbeddableSerializedState } from './types';

export const initializeSearchEmbeddableApi = async (
  initialState: SearchEmbeddableSerializedState,
  attributeService: { unwrapMethod: (id: string) => Promise<SavedSearchByValueAttributes> }
) => {
  // ts-ignore FIX THIS TYPE LATER
  const { attributes } = initialState?.savedObjectId
    ? await attributeService.unwrapMethod(initialState.savedObjectId)
    : initialState;

  const savedObjectId$ = new BehaviorSubject<string | undefined>(initialState?.savedObjectId);
  const attributes$ = new BehaviorSubject<SavedSearchByValueAttributes | undefined>(attributes);

  const getSearchEmbeddableComparators = (): StateComparators<SearchEmbeddableSerializedState> => {
    if (savedObjectId$.getValue()) {
      /** When saved to the library, only compare the saved object ID */
      return {
        savedObjectId: [
          savedObjectId$,
          (nextSavedObjectId?: string) => savedObjectId$.next(nextSavedObjectId),
        ],
      };
    }

    /** Otherwise, compare all of the state */
    return {
      attributes: [
        attributes$,
        (attributes) => attributes$.next(attributes),
        (a, b) => deepEqual(a, b),
      ],
    };
  };

  return {
    searchEmbeddableApi: {
      savedObjectId$,
      attributes$,
    },
    searchEmbeddableComparators: getSearchEmbeddableComparators(),
    serializeSearchEmbeddable: () => {
      const savedObjectId = savedObjectId$.getValue();
      if (savedObjectId) {
        return {
          savedObjectId,
        };
      }
      return {
        attributes: attributes$.getValue(),
      };
    },
  };
};
