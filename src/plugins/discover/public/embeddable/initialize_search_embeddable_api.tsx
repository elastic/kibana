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
} from '@kbn/saved-search-plugin/public';

import { DiscoverServices } from '../build_services';
import { getSortForEmbeddable } from '../utils';
import { SearchEmbeddableSerializedState } from './types';

export const initializeSearchEmbeddableApi = async (
  initialState: SearchEmbeddableSerializedState,
  {
    startServices,
    discoverServices,
  }: {
    startServices: {
      executeTriggerActions: (triggerId: string, context: object) => Promise<void>;
      // isEditable: () => boolean;
    };
    discoverServices: DiscoverServices;
  }
) => {
  const { attributeService, toSavedSearch } = discoverServices.savedSearch.byValue;

  const unwrapResult = initialState?.savedObjectId
    ? await attributeService.unwrapMethod(initialState.savedObjectId)
    : initialState;
  const { attributes: initialAttributes } = unwrapResult;
  // console.log('initialAttributes', initialState, initialAttributes, unwrapResult);

  // console.log('toSavedSearch');
  const savedSearch = await toSavedSearch(
    initialState?.savedObjectId,
    unwrapResult as SavedSearchUnwrapResult
  );
  // console.log('saved search', savedSearch);
  const parentSearchSource = await discoverServices.data.search.searchSource.create();
  savedSearch.searchSource.setParent(parentSearchSource);

  const savedSearch$ = new BehaviorSubject<SavedSearch>(savedSearch);
  const rows$ = new BehaviorSubject<DataTableRecord[]>([]);

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

  const savedSearchToAttributesSubscription = savedSearch$
    .pipe(skip(1))
    .subscribe((newSavedSearch) => {
      // console.log('savedSearchToAttributes', newSavedSearch);
      const { searchSourceJSON, references: originalReferences } =
        savedSearch.searchSource.serialize();
      attributes$.next({
        ...toSavedSearchAttributes(newSavedSearch, searchSourceJSON),
        references: originalReferences,
      });
    });

  const cleanup = () => {
    savedSearchToAttributesSubscription.unsubscribe();
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
      savedObjectId: savedObjectId$,
      attributes$,
      savedSearch$,
      rows$,
      getSavedSearch: () => savedSearch$.getValue(),
    },
    searchEmbeddableComparators: getSearchEmbeddableComparators(),
    serializeSearchEmbeddable: () => {
      // console.log('serializeSearchEmbeddable');
      const savedObjectId = savedObjectId$.getValue();
      if (savedObjectId) {
        return {
          savedObjectId,
        };
      }
      // console.log('---> attributes', attributes$.getValue())
      return {
        attributes: attributes$.getValue(),
      };
    },
  };
};
