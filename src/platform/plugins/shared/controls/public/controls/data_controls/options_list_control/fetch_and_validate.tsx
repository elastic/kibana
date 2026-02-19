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
import { getFetchContextFilters, getFetchContextTimeRange } from '../utils';
import type { DataControlStateManager } from '../data_control_manager';

export function fetchAndValidate$({
  api,
  allowExpensiveQueries$,
  requestSize$,
  runPastTimeout$,
  selectedOptions$,
  searchTechnique$,
  sort$,
}: {
  api: DataControlStateManager['api'] &
    Pick<OptionsListControlApi, 'parentApi' | 'uuid'> &
    Pick<OptionsListComponentApi, 'loadMoreSubject'> & {
      loadingSuggestions$: BehaviorSubject<boolean>;
      debouncedSearchString: Observable<string>;
    };
  allowExpensiveQueries$: PublishingSubject<boolean>;
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
    ignoreValidations: api.ignoreValidations$,
    sort: sort$,
    searchTechnique: searchTechnique$,
    allowExpensiveQueries: allowExpensiveQueries$,
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
        {
          allowExpensiveQueries,
          dataViews,
          field,
          fetchContext,
          useGlobalFilters,
          ignoreValidations,
          searchString,
          sort,
          searchTechnique,
        },
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

        const request = {
          sort,
          dataView,
          searchString,
          runPastTimeout,
          searchTechnique,
          selectedOptions,
          field: field.toSpec(),
          size: requestSize,

          ignoreValidations,
          ...fetchContext,
          timeRange: getFetchContextTimeRange(fetchContext, useGlobalFilters),
          filters: getFetchContextFilters(fetchContext, useGlobalFilters),
          allowExpensiveQueries,
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
