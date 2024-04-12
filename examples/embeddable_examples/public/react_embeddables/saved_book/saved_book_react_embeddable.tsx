/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ByRefCapableEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { initializeTitles } from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { SAVED_BOOK_ID } from './constants';
import { BookByReferenceState, BookByValueState } from './types';

const storage = new Storage(localStorage);

const bookStateIsByReference = (
  state?: BookByReferenceState | BookByValueState
): state is BookByReferenceState => {
  return Boolean(state && (state as BookByReferenceState).savedBookId !== undefined);
};

export const savedBookEmbeddableFactory: ByRefCapableEmbeddableFactory<
  BookByReferenceState,
  BookByValueState
> = {
  type: SAVED_BOOK_ID,
  load: async (state) => {
    if (!bookStateIsByReference(state?.rawState)) {
      return state;
    }
    await new Promise((r) => setTimeout(r, 1000)); // simulate load from network.
    const attributes = storage.get(state?.rawState?.savedBookId) as BookByValueState;
    return {
      ...state,
      rawState: {
        ...state.rawState,
        ...attributes,
      },
    };
  },
  deserializeState: (state) => {
    return state.rawState;
  },
  buildEmbeddable: async (state, buildApi) => {
    const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
    const authorName$ = new BehaviorSubject(state.authorName);
    const numberOfPages$ = new BehaviorSubject(state.numberOfPages);
    const savedBookId$ = new BehaviorSubject(state.savedBookId);

    const api = buildApi(
      {
        ...titlesApi,
        serializeState: () => {
          return {
            rawState: {
              ...serializeTitles(),
              authorName: authorName$.value,
              savedBookId: savedBookId$.value,
              numberOfPages: numberOfPages$.value,
            },
          };
        },
        saveState: async (stateToSave) => {
          return { ...stateToSave, rawState: {} };
        },
      },
      {
        authorName: [authorName$, authorName$.next],
        savedBookId: [savedBookId$, savedBookId$.next],
        numberOfPages: [numberOfPages$, numberOfPages$.next],
        ...titleComparators,
      }
    );

    return {
      api,
      Component: () => {
        return <div />;
      },
    };
  },
};
