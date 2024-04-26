/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCallOut } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTimeRange,
  fetch$,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import React, { useEffect } from 'react';
import { BehaviorSubject, switchMap, tap } from 'rxjs';
import { SEARCH_EMBEDDABLE_ID } from './constants';
import { getCount } from './get_count';
import { Api, Services, State } from './types';

export const getSearchEmbeddableFactory = (services: Services) => {
  const factory: ReactEmbeddableFactory<State, Api> = {
    type: SEARCH_EMBEDDABLE_ID,
    deserializeState: (state) => {
      return state.rawState as State;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const timeRange = initializeTimeRange(state);
      const defaultDataView = await services.dataViews.getDefaultDataView();
      const dataViews$ = new BehaviorSubject<DataView[] | undefined>(
        defaultDataView ? [defaultDataView] : undefined
      );
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);

      const api = buildApi(
        {
          ...timeRange.api,
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

      const error$ = new BehaviorSubject<Error | undefined>(undefined);
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
            error$.next(undefined);
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
                // whether to refetch data for just mask current data.
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
            error$.next(next.error);
          }
        });

      return {
        api,
        Component: () => {
          const [count, error] = useBatchedPublishingSubjects(count$, error$);

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
            };
          }, []);

          if (!defaultDataView) {
            return (
              <EuiCallOut title="Default data view not found" color="warning" iconType="warning">
                <p>Please install a sample data set to run example.</p>
              </EuiCallOut>
            );
          }

          if (error) {
            return (
              <EuiCallOut title="Search error" color="warning" iconType="warning">
                <p>{error.message}</p>
              </EuiCallOut>
            );
          }

          return (
            <p>
              Found <strong>{count}</strong> from {defaultDataView.name}
            </p>
          );
        },
      };
    },
  };
  return factory;
};
