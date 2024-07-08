/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiStat } from '@elastic/eui';
import { css } from '@emotion/react';
import { DataView } from '@kbn/data-views-plugin/common';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  fetch$,
  initializeTimeRange,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useEffect } from 'react';
import { BehaviorSubject, switchMap, tap } from 'rxjs';
import { SEARCH_EMBEDDABLE_ID } from './constants';
import { getCount } from './get_count';
import { SearchApi, Services, SearchSerializedState, SearchRuntimeState } from './types';

export const getSearchEmbeddableFactory = (services: Services) => {
  const factory: ReactEmbeddableFactory<SearchSerializedState, SearchRuntimeState, SearchApi> = {
    type: SEARCH_EMBEDDABLE_ID,
    deserializeState: (state) => state.rawState,
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const timeRange = initializeTimeRange(state);
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

      const api = buildApi(
        {
          ...timeRange.api,
          blockingError: blockingError$,
          dataViews: dataViews$,
          dataLoading: dataLoading$,
          serializeState: () => {
            return {
              rawState: {
                ...timeRange.serialize(),
              },
              references: [],
            };
          },
        },
        {
          ...timeRange.comparators,
        }
      );

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
          if (next && next.hasOwnProperty('count') && next.count !== undefined) {
            count$.next(next.count);
          }
          if (next && next.hasOwnProperty('error')) {
            blockingError$.next(next.error);
          }
        });

      return {
        api,
        Component: () => {
          const [count, error] = useBatchedPublishingSubjects(count$, blockingError$);

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
                padding: ${euiThemeVars.euiSizeM};
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
