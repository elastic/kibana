/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-plugin/common';
import {
  initializeTimeRange,
  PublishesTimeRange,
  StateComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { ReactEmbeddableApiRegistration } from '@kbn/embeddable-plugin/public/react_embeddable_system/types';
import { PresentationContainer } from '@kbn/presentation-containers';
import { Api, State, Services } from './types';
import { getCount } from './get_count';

export const buildSearchEmbeddable = async (
  state: State,
  buildApi: (
    apiRegistration: ReactEmbeddableApiRegistration<State, Api>,
    comparators: StateComparators<State>
  ) => Api,
  parentApi: PresentationContainer | undefined,
  services: Services
) => {
  const {
    appliedTimeRange$,
    cleanupTimeRange,
    serializeTimeRange,
    timeRangeApi,
    timeRangeComparators,
  } = initializeTimeRange(state, parentApi as Partial<PublishesTimeRange>);
  const defaultDataView = await services.dataViews.getDefaultDataView();
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(
    defaultDataView ? [defaultDataView] : undefined
  );
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  const api = buildApi(
    {
      ...timeRangeApi,
      dataViews: dataViews$,
      dataLoading: dataLoading$,
      serializeState: () => {
        return {
          rawState: {
            ...serializeTimeRange(),
          },
          references: [],
        };
      },
    },
    {
      ...timeRangeComparators,
    }
  );

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
          cleanupTimeRange();
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
