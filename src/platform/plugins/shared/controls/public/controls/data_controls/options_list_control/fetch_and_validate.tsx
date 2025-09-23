/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject, Observable } from 'rxjs';
import { combineLatest, debounceTime, startWith, switchMap, tap, withLatestFrom } from 'rxjs';

import { fetch$, type PublishingSubject } from '@kbn/presentation-publishing';
import type {
  OptionsListSearchTechnique,
  OptionsListSelection,
  OptionsListSortingType,
} from '@kbn/controls-schemas';

import { isValidSearch } from '../../../../common/options_list/is_valid_search';
import type { OptionsListSuccessResponse } from '../../../../common/options_list/types';
import { OptionsListFetchCache } from './options_list_fetch_cache';
import type { OptionsListComponentApi, OptionsListControlApi } from './types';
import { getFetchContextFilters } from '../utils';

export function fetchAndValidate$({
  api,
  requestSize$,
  runPastTimeout$,
  selectedOptions$,
  searchTechnique$,
  sort$,
}: {
  api: Pick<
    OptionsListControlApi,
    'dataViews$' | 'field$' | 'setBlockingError' | 'parentApi' | 'uuid' | 'useGlobalFilters$'
  > &
    Pick<OptionsListComponentApi, 'loadMoreSubject'> & {
      loadingSuggestions$: BehaviorSubject<boolean>;
      debouncedSearchString: Observable<string>;
    };
  requestSize$: PublishingSubject<number>;
  runPastTimeout$: PublishingSubject<boolean | undefined>;
  selectedOptions$: PublishingSubject<OptionsListSelection[] | undefined>;
  searchTechnique$: PublishingSubject<OptionsListSearchTechnique | undefined>;
  sort$: PublishingSubject<OptionsListSortingType | undefined>;
}): Observable<OptionsListSuccessResponse | { error: Error }> {
  const requestCache = new OptionsListFetchCache();
  let abortController: AbortController | undefined;

  return combineLatest({
    dataViews: api.dataViews$,
    field: api.field$,
    fetchContext: fetch$(api),
    useGlobalFilters: api.useGlobalFilters$,
    searchString: api.debouncedSearchString,
    sort: sort$,
    searchTechnique: searchTechnique$,
    // cannot use requestSize directly, because we need to be able to reset the size to the default without refetching
    loadMore: api.loadMoreSubject.pipe(
      startWith(null), // start with null so that `combineLatest` subscription fires
      debounceTime(100) // debounce load more so "loading" state briefly shows
    ),
  }).pipe(
    tap(() => {
      // abort any in progress requests
      if (abortController) {
        abortController.abort();
        abortController = undefined;
      }
    }),
    withLatestFrom(requestSize$, runPastTimeout$, selectedOptions$),
    switchMap(
      async ([
        { dataViews, field, fetchContext, useGlobalFilters, searchString, sort, searchTechnique },
        requestSize,
        runPastTimeout,
        selectedOptions,
      ]) => {
        const dataView = dataViews?.[0];
        if (
          !dataView ||
          !field ||
          !isValidSearch({ searchString, fieldType: field.type, searchTechnique })
        ) {
          return { suggestions: [] };
        }

        /** Fetch the suggestions list + perform validation */
        api.loadingSuggestions$.next(true);
        fetchContext.filters = getFetchContextFilters(fetchContext, useGlobalFilters);

        const request = {
          sort,
          dataView,
          searchString,
          runPastTimeout,
          searchTechnique,
          selectedOptions,
          field: field.toSpec(),
          size: requestSize,

          // TODO get expensive queries setting and ignore validations
          allowExpensiveQueries: true,
          ignoreValidations: false,
          ...fetchContext,
        };

        const newAbortController = new AbortController();
        abortController = newAbortController;
        try {
          return await requestCache.runFetchRequest(request, newAbortController.signal);
        } catch (error) {
          return { error };
        }
      }
    ),
    tap(() => {
      api.loadingSuggestions$.next(false);
    })
  );
}
