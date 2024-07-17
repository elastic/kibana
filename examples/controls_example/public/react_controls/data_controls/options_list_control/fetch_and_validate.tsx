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

import { OptionsListSuccessResponse } from '@kbn/controls-plugin/common/options_list/types';
import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

import { isValidSearch } from '../../../../common/options_list/is_valid_search';
import { ControlFetchContext } from '../../control_group/control_fetch';
import { ControlStateManager } from '../../types';
import { OptionsListRequestCache } from './options_list_request_cache';
import { OptionsListComponentApi, OptionsListComponentState, OptionsListControlApi } from './types';

export function fetchAndValidate$({
  api,
  services,
  stateManager,
}: {
  api: Pick<OptionsListControlApi, 'dataViews' | 'fieldSpec' | 'setBlockingError'> &
    Pick<OptionsListComponentApi, 'loadMoreSubject' | 'allowExpensiveQueries$'> & {
      controlFetch$: Observable<ControlFetchContext>;
      loadingSuggestions$: BehaviorSubject<boolean>;
      debouncedSearchString: Observable<string>;
    };
  services: {
    http: CoreStart['http'];
    uiSettings: CoreStart['uiSettings'];
    data: DataPublicPluginStart;
  };
  stateManager: ControlStateManager<OptionsListComponentState>;
}): Observable<OptionsListSuccessResponse | { error: Error }> {
  let abortController: AbortController | undefined;

  const requestCache = new OptionsListRequestCache();

  return combineLatest([
    api.dataViews,
    api.fieldSpec,
    api.controlFetch$,
    api.allowExpensiveQueries$,
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
          fieldSpec,
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
          !fieldSpec ||
          !isValidSearch({ searchString, fieldType: fieldSpec.type, searchTechnique })
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
          field: fieldSpec,
          size: requestSize,
          allowExpensiveQueries,
          ...controlFetchContext,
        };

        const newAbortController = new AbortController();
        abortController = newAbortController;
        try {
          return await requestCache.runRequest(request, newAbortController.signal, services);
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
