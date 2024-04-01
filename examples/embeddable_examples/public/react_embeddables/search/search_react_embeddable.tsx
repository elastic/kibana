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
import { FetchContext, getFetchContext, initializeTimeRange, subscribeToFetch, useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import React, { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
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

      let isUnmounted = false;
      let onFetchCallCount = 0;
      const error$ = new BehaviorSubject<Error | undefined>(undefined);
      const count$ = new BehaviorSubject<number>(0);
      const onFetch = (fetchContext: FetchContext, isCanceled: () => boolean) => {
        console.log('onFetch', fetchContext);
        onFetchCallCount++;
        error$.next(undefined);
        if (!defaultDataView) {
          return;
        }
        dataLoading$.next(true);
        getCount(defaultDataView, services.data, fetchContext.filters ?? [], fetchContext.query, fetchContext.timeRange)
          .then((nextCount: number) => {
            if (isUnmounted || isCanceled()) {
              return;
            }
            dataLoading$.next(false);
            count$.next(nextCount);
          })
          .catch((err) => {
            if (isUnmounted || isCanceled()) {
              return;
            }
            dataLoading$.next(false);
            error$.next(err);
          });
      }
      const unsubscribeFromFetch = subscribeToFetch(api, onFetch);

      return {
        api,
        Component: () => {
          const count = useStateFromPublishingSubject(count$);
          const error = useStateFromPublishingSubject(error$);

          useEffect(() => {
            onFetch(getFetchContext(api), () => onFetchCallCount > 1);

            return () => {
              isUnmounted = true;
              unsubscribeFromFetch();
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
