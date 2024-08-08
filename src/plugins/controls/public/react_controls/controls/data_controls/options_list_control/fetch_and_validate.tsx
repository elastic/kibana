/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  Observable,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

import { PublishingSubject } from '@kbn/presentation-publishing';
import { OptionsListSuccessResponse } from '../../../../../common/options_list/types';
import { isValidSearch } from '../../../../../common/options_list/is_valid_search';
import { OptionsListSelection } from '../../../../../common/options_list/options_list_selections';
import { ControlFetchContext } from '../../../control_group/control_fetch';
import { ControlStateManager } from '../../types';
import { DataControlServices } from '../types';
import { OptionsListFetchCache } from './options_list_fetch_cache';
import { OptionsListComponentApi, OptionsListComponentState, OptionsListControlApi } from './types';

export function fetchAndValidate$({
  api,
  services,
  stateManager,
}: {
  api: Pick<OptionsListControlApi, 'dataViews' | 'field$' | 'setBlockingError' | 'parentApi'> &
    Pick<OptionsListComponentApi, 'loadMoreSubject'> & {
      controlFetch$: Observable<ControlFetchContext>;
      loadingSuggestions$: BehaviorSubject<boolean>;
      debouncedSearchString: Observable<string>;
    };
  services: DataControlServices;
  stateManager: ControlStateManager<
    Pick<OptionsListComponentState, 'requestSize' | 'runPastTimeout' | 'searchTechnique' | 'sort'>
  > & {
    selectedOptions: PublishingSubject<OptionsListSelection[] | undefined>;
  };
}): Observable<OptionsListSuccessResponse | { error: Error }> {
  const requestCache = new OptionsListFetchCache();
  let abortController: AbortController | undefined;

  return combineLatest([
    api.dataViews,
    api.field$,
    api.controlFetch$,
    api.parentApi.allowExpensiveQueries$,
    api.debouncedSearchString,
    stateManager.sort,
    stateManager.searchTechnique,
    // cannot use requestSize directly, because we need to be able to reset the size to the default without refetching
    api.loadMoreSubject.pipe(debounceTime(100)), // debounce load more so "loading" state briefly shows
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
          ...controlFetchContext,
        };

        const newAbortController = new AbortController();
        abortController = newAbortController;
        try {
          return await requestCache.runFetchRequest(request, newAbortController.signal, services);
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
