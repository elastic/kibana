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
  of,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

import { PublishingSubject } from '@kbn/presentation-publishing';
import { apiPublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import { OptionsListSuccessResponse } from '../../../../common/options_list/types';
import { isValidSearch } from '../../../../common/options_list/is_valid_search';
import { OptionsListSelection } from '../../../../common/options_list/options_list_selections';
import { ControlFetchContext } from '../../../control_group/control_fetch';
import { ControlStateManager } from '../../types';
import { OptionsListFetchCache } from './options_list_fetch_cache';
import { OptionsListComponentApi, OptionsListComponentState, OptionsListControlApi } from './types';

export function fetchAndValidate$({
  api,
  stateManager,
}: {
  api: Pick<OptionsListControlApi, 'dataViews$' | 'field$' | 'setBlockingError' | 'parentApi'> &
    Pick<OptionsListComponentApi, 'loadMoreSubject'> & {
      controlFetch$: Observable<ControlFetchContext>;
      loadingSuggestions$: BehaviorSubject<boolean>;
      debouncedSearchString: Observable<string>;
    };
  stateManager: ControlStateManager<
    Pick<OptionsListComponentState, 'requestSize' | 'runPastTimeout' | 'searchTechnique' | 'sort'>
  > & {
    selectedOptions: PublishingSubject<OptionsListSelection[] | undefined>;
  };
}): Observable<OptionsListSuccessResponse | { error: Error }> {
  const requestCache = new OptionsListFetchCache();
  let abortController: AbortController | undefined;

  return combineLatest([
    api.dataViews$,
    api.field$,
    api.controlFetch$,
    api.parentApi.allowExpensiveQueries$,
    api.parentApi.ignoreParentSettings$,
    api.debouncedSearchString,
    stateManager.sort,
    stateManager.searchTechnique,
    // cannot use requestSize directly, because we need to be able to reset the size to the default without refetching
    api.loadMoreSubject.pipe(
      startWith(null), // start with null so that `combineLatest` subscription fires
      debounceTime(100) // debounce load more so "loading" state briefly shows
    ),
    apiPublishesReload(api.parentApi)
      ? api.parentApi.reload$.pipe(
          tap(() => requestCache.clearCache()),
          startWith(undefined)
        )
      : of(undefined),
  ]).pipe(
    tap(() => {
      // abort any in progress requests
      if (abortController) {
        abortController.abort();
        abortController = undefined;
      }
    }),
    withLatestFrom(
      stateManager.requestSize,
      stateManager.runPastTimeout,
      stateManager.selectedOptions
    ),
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
