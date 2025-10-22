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

import type { PublishingSubject } from '@kbn/presentation-publishing';
import type {
  OptionsListSearchTechnique,
  OptionsListSortingType,
} from '../../../../common/options_list';
import type { OptionsListSuccessResponse } from '../../../../common/options_list/types';
import { isValidSearch } from '../../../../common/options_list/is_valid_search';
import type { OptionsListSelection } from '../../../../common/options_list/options_list_selections';
import type { ControlFetchContext } from '../../../control_group/control_fetch';
import { OptionsListFetchCache } from './options_list_fetch_cache';
import type { OptionsListComponentApi, OptionsListControlApi } from './types';

export function fetchAndValidate$({
  api,
  requestSize$,
  runPastTimeout$,
  selectedOptions$,
  searchTechnique$,
  sort$,
  controlFetch$,
}: {
  api: Pick<OptionsListControlApi, 'dataViews$' | 'field$' | 'setBlockingError' | 'parentApi'> &
    Pick<OptionsListComponentApi, 'loadMoreSubject'> & {
      loadingSuggestions$: BehaviorSubject<boolean>;
      debouncedSearchString: Observable<string>;
    };
  requestSize$: PublishingSubject<number>;
  runPastTimeout$: PublishingSubject<boolean | undefined>;
  selectedOptions$: PublishingSubject<OptionsListSelection[] | undefined>;
  searchTechnique$: PublishingSubject<OptionsListSearchTechnique | undefined>;
  sort$: PublishingSubject<OptionsListSortingType | undefined>;
  controlFetch$: (onReload: () => void) => Observable<ControlFetchContext>;
}): Observable<OptionsListSuccessResponse | { error: Error }> {
  const requestCache = new OptionsListFetchCache();
  let abortController: AbortController | undefined;

  return combineLatest([
    api.dataViews$,
    api.field$,
    controlFetch$(requestCache.clearCache),
    api.parentApi.allowExpensiveQueries$,
    api.parentApi.ignoreParentSettings$,
    api.debouncedSearchString,
    sort$,
    searchTechnique$,
    // cannot use requestSize directly, because we need to be able to reset the size to the default without refetching
    api.loadMoreSubject.pipe(
      startWith(null), // start with null so that `combineLatest` subscription fires
      debounceTime(100) // debounce load more so "loading" state briefly shows
    ),
  ]).pipe(
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
        [
          dataViews,
          field,
          controlFetchContext,
          allowExpensiveQueries,
          ignoreParentSettings,
          searchString,
          sort,
          searchTechnique,
        ],
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
          allowExpensiveQueries,
          ignoreValidations: ignoreParentSettings?.ignoreValidations,
          ...controlFetchContext,
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
