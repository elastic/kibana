/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'react-fast-compare';
import { BehaviorSubject, skip } from 'rxjs';

import { DataTableRecord } from '@kbn/discover-utils/types';
import type { StateComparators } from '@kbn/presentation-publishing';
import { toSavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import {
  SavedSearch,
  SavedSearchByValueAttributes,
  SavedSearchUnwrapResult,
  SortOrder,
} from '@kbn/saved-search-plugin/public';

import { DiscoverServices } from '../../build_services';
import { getSortForEmbeddable } from '../../utils';
import { SearchEmbeddableSerializedState } from '../types';

export const initializeSearchEmbeddableApi = async (
  initialState: SearchEmbeddableSerializedState,
  {
    startServices,
    discoverServices,
  }: {
    startServices: {
      executeTriggerActions: (triggerId: string, context: object) => Promise<void>;
      isEditable: () => boolean;
    };
    discoverServices: DiscoverServices;
  }
) => {
  const { attributeService, toSavedSearch } = discoverServices.savedSearch.byValue;

  const unwrapResult = initialState?.savedObjectId
    ? await attributeService.unwrapMethod(initialState.savedObjectId)
    : initialState;
  const { attributes: initialAttributes } = unwrapResult;

  const savedSearch = await toSavedSearch(
    initialState?.savedObjectId,
    unwrapResult as SavedSearchUnwrapResult
  );
  const savedSearch$ = new BehaviorSubject<SavedSearch>(savedSearch);
  const rows$ = new BehaviorSubject<DataTableRecord[]>([]);
  // const sort$ = new BehaviorSubject<SortOrder[]>(
  //   initialAttributes?.sort ??
  //     getSortForEmbeddable(
  //       savedSearch,
  //       getSortForEmbeddable(savedSearch, undefined, discoverServices.uiSettings),
  //       discoverServices.uiSettings
  //     )
  // );
  // const rowHeight$ = new BehaviorSubject<number | undefined>(initialAttributes?.rowHeight);
  // const headerRowHeight$ = new BehaviorSubject<number | undefined>(
  //   initialAttributes?.headerRowHeight
  // );
  // const rowsPerPage$ = new BehaviorSubject<number | undefined>(initialAttributes?.rowsPerPage);
  // const sampleSize$ = new BehaviorSubject<number | undefined>(initialAttributes?.sampleSize);

  // by reference
  const savedObjectId$ = new BehaviorSubject<string | undefined>(initialState?.savedObjectId);
  // by value
  const attributes$ = new BehaviorSubject<SavedSearchByValueAttributes>(
    initialAttributes ??
      ({
        columns: [] as string[],
        sort: getSortForEmbeddable(savedSearch, undefined, discoverServices.uiSettings),
      } as SavedSearchByValueAttributes)
  );

  const savedSearchToAttributes = savedSearch$.pipe(skip(1)).subscribe((newSavedSearch) => {
    const { searchSourceJSON, references: originalReferences } =
      savedSearch.searchSource.serialize();

    attributes$.next({
      ...toSavedSearchAttributes(newSavedSearch, searchSourceJSON),
      references: originalReferences,
    });
  });

  const cleanup = () => {
    savedSearchToAttributes.unsubscribe();
  };

  // savedSearchToAttributes - unsubscribe

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
        attributes$ as BehaviorSubject<SavedSearchByValueAttributes | undefined>,
        (attributes: SavedSearchByValueAttributes | undefined) =>
          attributes$.next(attributes as SavedSearchByValueAttributes),
        (a, b) => deepEqual(a, b),
      ],
    };
  };

  return {
    onUnmount: cleanup,
    searchEmbeddableApi: {
      savedObjectId$,
      attributes$,
      savedSearch$,
      rows$,
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

// const columns$ = new BehaviorSubject<string[]>(initialAttributes?.columns ?? []);
// const sort$ = new BehaviorSubject<SortOrder[]>(
//   initialAttributes?.sort ??
//     getSortForEmbeddable(
//       savedSearch,
//       getSortForEmbeddable(savedSearch, undefined, discoverServices.uiSettings),
//       discoverServices.uiSettings
//     )
// );
// const rowHeight$ = new BehaviorSubject<number | undefined>(initialAttributes?.rowHeight);
// const headerRowHeight$ = new BehaviorSubject<number | undefined>(
//   initialAttributes?.headerRowHeight
// );
// const rowsPerPage$ = new BehaviorSubject<number | undefined>(initialAttributes?.rowsPerPage);
// const sampleSize$ = new BehaviorSubject<number | undefined>(initialAttributes?.sampleSize);

// const attributes$ = new BehaviorSubject<SavedSearchByValueAttributes>(
// initialAttributes ??
//   ({
//     ...savedSearch,
//     columns: [] as string[],
//     sort: getSortForEmbeddable(
//       savedSearch,
//       getSortForEmbeddable(savedSearch, undefined, discoverServices.uiSettings),
//       discoverServices.uiSettings
//     ),
//   } as SavedSearchByValueAttributes)
// );

// console.log('initialAttributes', attributes$.getValue());

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
//   } as SavedSearchByValueAttributes)
// );
// // UNSUBSCRIBE
