/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiStat, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  fetch$,
  initializeTimeRangeManager,
  timeRangeComparators,
  useBatchedPublishingSubjects,
  initializeUnsavedChanges,
} from '@kbn/presentation-publishing';
import React, { useEffect } from 'react';
import { BehaviorSubject, switchMap, tap } from 'rxjs';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';
import { getCount } from './get_count';
import type { SearchApi, Services, SearchSerializedState } from './types';

export const getSearchEmbeddableFactory = (services: Services) => {
  const factory: EmbeddableFactory<SearchSerializedState, SearchApi> = {
    type: SEARCH_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const timeRangeManager = initializeTimeRangeManager(initialState);
      const defaultDataView = await services.dataViews.getDefaultDataView();
      const dataViews$ = new BehaviorSubject<DataView[] | undefined>(
        defaultDataView ? [defaultDataView] : undefined
      );
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      if (!defaultDataView) {
        blockingError$.next(
          new Error(
            i18n.translate('embeddableExamples.search.noDataViewError', {
              defaultMessage: 'Please install a data view to view this example',
            })
          )
        );
      }

      function serializeState() {
        return {
          ...timeRangeManager.getLatestState(),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: timeRangeManager.anyStateChange$,
        getComparators: () => {
          /**
           * comparators are provided in a callback to allow embeddables to change how their state is compared based
           * on the values of other state. For instance, if a saved object ID is present (by reference), the embeddable
           * may want to skip comparison of certain state.
           */
          return timeRangeComparators;
        },
        onReset: (lastSaved) => {
          /**
           * if this embeddable had a difference between its runtime and serialized state, we could run the 'deserializeState'
           * function here before resetting. onReset can be async so to support a potential async deserialize function.
           */

          timeRangeManager.reinitializeState(lastSaved);
        },
      });

      const api = finalizeApi({
        blockingError$,
        dataViews$,
        dataLoading$,
        ...unsavedChangesApi,
        ...timeRangeManager.api,
        serializeState,
      });

      const count$ = new BehaviorSubject<number>(0);
      let prevRequestAbortController: AbortController | undefined;
      const fetchSubscription = fetch$(api)
        .pipe(
          tap(() => {
            if (prevRequestAbortController) {
              prevRequestAbortController.abort();
            }
          }),
          switchMap(async (fetchContext) => {
            blockingError$.next(undefined);
            if (!defaultDataView) {
              return;
            }

            try {
              dataLoading$.next(true);
              const abortController = new AbortController();
              prevRequestAbortController = abortController;
              const count = await getCount(
                defaultDataView,
                services.data,
                fetchContext.filters ?? [],
                fetchContext.query,
                // timeRange and timeslice provided seperatly so consumers can decide
                // whether to refetch data or just mask current data.
                // In this example, we must refetch because we need a count within the time range.
                fetchContext.timeslice
                  ? {
                      from: new Date(fetchContext.timeslice[0]).toISOString(),
                      to: new Date(fetchContext.timeslice[1]).toISOString(),
                      mode: 'absolute' as 'absolute',
                    }
                  : fetchContext.timeRange,
                abortController.signal,
                fetchContext.searchSessionId
              );
              return { count };
            } catch (error) {
              return error.name === 'AbortError' ? undefined : { error };
            }
          })
        )
        .subscribe((next) => {
          dataLoading$.next(false);
          if (next && Object.hasOwn(next, 'count') && next.count !== undefined) {
            count$.next(next.count);
          }
          if (next && Object.hasOwn(next, 'error')) {
            blockingError$.next(next.error);
          }
        });

      return {
        api,
        Component: () => {
          const [count, error] = useBatchedPublishingSubjects(count$, blockingError$);
          const { euiTheme } = useEuiTheme();

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
            };
          }, []);

          // in error case we can return null because the panel will handle rendering the blocking error.
          if (error || !defaultDataView) return null;

          return (
            <div
              css={css`
                width: 100%;
                padding: ${euiTheme.size.m};
              `}
            >
              <EuiStat
                title={count}
                titleColor="subdued"
                description={
                  <span>
                    <EuiBadge iconType="index" color="hollow">
                      {i18n.translate('embeddableExamples.search.dataViewName', {
                        defaultMessage: '{dataViewName}',
                        values: { dataViewName: defaultDataView.name },
                      })}
                    </EuiBadge>
                  </span>
                }
                titleSize="l"
              >
                {i18n.translate('embeddableExamples.search.result', {
                  defaultMessage: '{count, plural, one {document} other {documents}} found',
                  values: { count },
                })}
              </EuiStat>
            </div>
          );
        },
      };
    },
  };
  return factory;
};
