/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, combineLatest } from 'rxjs';
import deepEqual from 'react-fast-compare';

import type { StateComparators } from '@kbn/presentation-publishing';
import {
  SavedSearchAttributeService,
  SavedSearchByValueAttributes,
  SearchByReferenceInput,
  SortOrder,
} from '..';
import { SearchEmbeddableSerializedState } from './types';
import { SavedSearch, SavedSearchUnwrapResult, toSavedSearch } from '../services/saved_searches';
import { getSortForEmbeddable } from './sorting';

export const initializeSearchEmbeddableApi = async (
  initialState: SearchEmbeddableSerializedState,
  attributeService: SavedSearchAttributeService,
  getSavedSearch: (id: string | undefined, result: SavedSearchUnwrapResult) => Promise<SavedSearch>
) => {
  const unwrapResult = initialState?.savedObjectId
    ? await attributeService.unwrapMethod(initialState.savedObjectId)
    : initialState;
  const { attributes: initialAttributes } = unwrapResult;

  const savedSearch = await getSavedSearch(
    initialState?.savedObjectId,
    unwrapResult as SavedSearchUnwrapResult
  );
  console.log('savedSearch ', savedSearch);

  // const columns$ = new BehaviorSubject<string[]>(initialAttributes?.columns ?? []);
  // const sort$ = new BehaviorSubject<SortOrder[]>(initialAttributes?.sort ?? []);
  // const rowHeight$ = new BehaviorSubject<number | undefined>(initialAttributes?.rowHeight);
  // const headerRowHeight$ = new BehaviorSubject<number | undefined>(
  //   initialAttributes?.headerRowHeight
  // );
  // const rowsPerPage$ = new BehaviorSubject<number | undefined>(initialAttributes?.rowsPerPage);
  // const sampleSize$ = new BehaviorSubject<number | undefined>(initialAttributes?.sampleSize);

  // by reference
  const savedObjectId$ = new BehaviorSubject<string | undefined>(initialState?.savedObjectId);
  // by value
  const attributes$ = new BehaviorSubject<SavedSearchByValueAttributes>(initialAttributes);
  // const attributes$ = new BehaviorSubject<SavedSearchByValueAttributes>(
  //   initialAttributes ?? {
  //     sort: getSortForEmbeddable(
  //       savedSearch,
  //       sort: attributes.sort,
  //       this.services.uiSettings,
  //     ),
  //     columns: savedSearch.columns,
  //   }
  // );

  // const latestStateSubscription = combineLatest([
  //   columns$,
  //   sort$,
  //   rowHeight$,
  //   headerRowHeight$,
  //   rowsPerPage$,
  //   sampleSize$,
  // ]).subscribe(([columns, sort, rowHeight, headerRowHeight, rowsPerPage, sampleSize]) =>
  //   attributes$.next({
  //     columns,
  //     sort,
  //     rowHeight,
  //     headerRowHeight,
  //     rowsPerPage,
  //     sampleSize,
  //   })
  // );

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
