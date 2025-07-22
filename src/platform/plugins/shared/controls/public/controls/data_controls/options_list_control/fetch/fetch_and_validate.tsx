/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  Observable,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

import { PublishingSubject } from '@kbn/presentation-publishing';
import { ControlInputOption } from '../../../../../common';
import {
  OptionsListSearchTechnique,
  OptionsListSortingType,
} from '../../../../../common/options_list';
import {
  OptionsListRequest,
  OptionsListSuccessResponse,
} from '../../../../../common/options_list/types';
import { isValidSearch } from '../../../../../common/options_list/is_valid_search';
import { OptionsListSelection } from '../../../../../common/options_list/options_list_selections';
import { ControlFetchContext } from '../../../../control_group/control_fetch';
import { GetESQLSingleColumnValuesParams } from '../../common/get_esql_single_column_values';
import { OptionsListComponentApi, OptionsListControlApi } from '../types';
import { OptionsListFetchCache } from './options_list_fetch_cache';

export function fetchAndValidate$({
  api,
  requestSize$,
  runPastTimeout$,
  selectedOptions$,
  searchTechnique$,
  sort$,
  controlFetch$,
}: {
  api: Pick<
    OptionsListControlApi,
    'input$' | 'dataViews$' | 'field$' | 'esqlQuery$' | 'setBlockingError' | 'parentApi'
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
  controlFetch$: (onReload: () => void) => Observable<ControlFetchContext>;
}): Observable<OptionsListSuccessResponse | { error: Error }> {
  const requestCache = new OptionsListFetchCache();
  let abortController: AbortController | undefined;

  return combineLatest([
    api.input$,
    api.dataViews$,
    api.field$,
    api.esqlQuery$,
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
          input,
          dataViews,
          field,
          esqlQuery,
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
        let request: OptionsListRequest | GetESQLSingleColumnValuesParams;
        if (input === ControlInputOption.ESQL) {
          if (!esqlQuery) return { suggestions: [] };
          request = { query: esqlQuery, timeRange: controlFetchContext.timeRange };
        } else {
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

          request = {
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
        }
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
