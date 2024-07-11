/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, combineLatest, debounceTime, switchMap, tap, withLatestFrom } from 'rxjs';

import { type OptionsListResponse } from '@kbn/controls-plugin/common/options_list/types';
import { CoreStart } from '@kbn/core/public';

import { ControlGroupApi } from '../../control_group/types';
import { ControlStateManager } from '../../types';
import { OptionsListComponentState, OptionsListControlApi } from './types';

export function fetchSuggestions$({
  api,
  services,
  stateManager,
}: {
  api: Pick<OptionsListControlApi, 'dataViews'> & {
    dataControlFetch$: ControlGroupApi['dataControlFetch$'];
    loadingSuggestions$: BehaviorSubject<boolean>;
  };
  services: { http: CoreStart['http'] };
  stateManager: ControlStateManager<
    Pick<
      OptionsListComponentState,
      | 'fieldName'
      | 'searchString'
      | 'runPastTimeout'
      | 'sort'
      | 'searchTechnique'
      | 'selectedOptions'
      | 'requestSize'
    >
  >;
}) {
  let prevRequestAbortController: AbortController | undefined;
  const searchStringDebounced = stateManager.searchString.pipe(debounceTime(100));

  return combineLatest([
    api.dataViews,
    api.dataControlFetch$,
    stateManager.fieldName,
    searchStringDebounced,
    stateManager.sort,
    stateManager.searchTechnique,
    stateManager.requestSize,
  ]).pipe(
    tap(() => {
      if (prevRequestAbortController) {
        prevRequestAbortController.abort();
        prevRequestAbortController = undefined;
      }
    }),
    withLatestFrom(stateManager.runPastTimeout, stateManager.selectedOptions),
    switchMap(
      async ([
        [
          dataViews,
          dataControlFetchContext,
          fieldName,
          searchString,
          sort,
          searchTechnique,
          requestSize,
        ],
        runPastTimeout,
        selectedOptions,
      ]) => {
        api.loadingSuggestions$.next(true);
        const dataView = dataViews?.[0];
        const dataViewField =
          dataView && fieldName ? dataView.getFieldByName(fieldName) : undefined;
        if (!dataView) {
          return { suggestions: [] };
        }
        try {
          const abortController = new AbortController();
          prevRequestAbortController = abortController;
          /** TODO: Handle caching */
          const result = await services.http.fetch<OptionsListResponse>(
            `/internal/controls/optionsList/${dataView.getIndexPattern()}`,
            {
              version: '1',
              body: JSON.stringify({
                allowExpensiveQueries: true,
                fieldName,
                fieldSpec: dataViewField,
                filters: dataControlFetchContext.unifiedSearchFilters,
                query: dataControlFetchContext.query,
                runPastTimeout,
                runtimeFieldMap: dataView.toSpec().runtimeFieldMap,
                searchString,
                searchTechnique,
                selectedOptions,
                size: requestSize,
                sort,
                timeRange: dataControlFetchContext.timeRange,
              }),
              signal: abortController.signal,
              method: 'POST',
            }
          );
          return result;
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
