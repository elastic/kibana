/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import fastIsEqual from 'fast-deep-equal';
import { EuiCallOut } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-plugin/common';
import { StateComparators, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { ReactEmbeddableApiRegistration } from '@kbn/embeddable-plugin/public/react_embeddable_system/types';
import { Api, State, Services } from './types';
import { getCount } from './get_count';

export const buildSearchEmbeddable = async (
  state: State,
  buildApi: (
    apiRegistration: ReactEmbeddableApiRegistration<State, Api>,
    comparators: StateComparators<State>
  ) => Api,
  services: Services
) => {
  const defaultDataView = await services.dataViews.getDefaultDataView();
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(state.timeRange);
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(
    defaultDataView ? [defaultDataView] : undefined
  );
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  function setTimeRange(nextTimeRange: TimeRange | undefined) {
    timeRange$.next(nextTimeRange);
  }

  const api = buildApi(
    {
      dataViews: dataViews$,
      timeRange$,
      setTimeRange,
      dataLoading: dataLoading$,
      serializeState: () => {
        return {
          rawState: {
            timeRange: timeRange$.value,
          },
          references: [],
        };
      },
    },
    {
      timeRange: [timeRange$, setTimeRange, fastIsEqual],
    }
  );

  const appliedTimeRange$ = new BehaviorSubject(
    timeRange$.value ?? api.parentApi?.timeRange$?.value
  );
  const subscriptions = api.timeRange$.subscribe((timeRange) => {
    appliedTimeRange$.next(timeRange ?? api.parentApi?.timeRange$?.value);
  });
  if (api.parentApi?.timeRange$) {
    subscriptions.add(
      api.parentApi?.timeRange$.subscribe((parentTimeRange) => {
        if (timeRange$?.value) {
          return;
        }
        appliedTimeRange$.next(parentTimeRange);
      })
    );
  }

  return {
    api,
    Component: () => {
      const [count, setCount] = useState<number>(0);
      const [error, setError] = useState<Error | undefined>();
      const [filters, query, appliedTimeRange] = useBatchedPublishingSubjects(
        api.parentApi?.filters$,
        api.parentApi?.query$,
        appliedTimeRange$
      );

      useEffect(() => {
        return () => {
          subscriptions.unsubscribe();
        };
      }, []);

      useEffect(() => {
        let ignore = false;
        setError(undefined);
        if (!defaultDataView) {
          return;
        }
        dataLoading$.next(true);
        getCount(defaultDataView, services.data, filters ?? [], query, appliedTimeRange)
          .then((nextCount: number) => {
            if (ignore) {
              return;
            }
            dataLoading$.next(false);
            setCount(nextCount);
          })
          .catch((err) => {
            if (ignore) {
              return;
            }
            dataLoading$.next(false);
            setError(err);
          });
        return () => {
          ignore = true;
        };
      }, [filters, query, appliedTimeRange]);

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
};
