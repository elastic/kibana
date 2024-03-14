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
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import {
  EmbeddableStateComparators,
  ReactEmbeddableApiRegistration,
} from '@kbn/embeddable-plugin/public/react_embeddable_system/types';
import { Api, State, Services } from './types';
import { getCount } from './get_count';

export const buildEmbeddable = async (
  state: State,
  buildApi: (
    apiRegistration: ReactEmbeddableApiRegistration<State, Api>,
    comparators: EmbeddableStateComparators<State>
  ) => Api,
  services: Services
) => {
  const defaultDataView = await services.dataViews.getDefaultDataView();
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(state.timeRange);
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(
    defaultDataView ? [defaultDataView] : undefined
  );

  const api = buildApi(
    {
      dataViews: dataViews$,
      timeRange$,
      setTimeRange: (nextTimeRange: TimeRange | undefined) => {
        timeRange$.next(nextTimeRange);
      },
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
      timeRange: [
        timeRange$,
        (nextTimeRange: TimeRange | undefined) => {
          timeRange$.next(nextTimeRange);
        },
        fastIsEqual,
      ],
    }
  );

  return {
    api,
    Component: () => {
      const [count, setCount] = useState<number>(0);
      const [error, setError] = useState<Error | undefined>();
      const [filters, query, parentTimeRange, timeRange] = useBatchedPublishingSubjects(
        api.parentApi?.filters$,
        api.parentApi?.query$,
        api.parentApi?.timeRange$,
        timeRange$
      );

      useEffect(() => {
        let ignore = false;
        setError(undefined);
        if (!defaultDataView) {
          return;
        }
        getCount(defaultDataView, services.data, filters ?? [], query, timeRange ?? parentTimeRange)
          .then((nextCount: number) => {
            if (ignore) {
              return;
            }
            setCount(nextCount);
          })
          .catch((err) => {
            if (ignore) {
              return;
            }
            setError(err);
          });
        return () => {
          ignore = true;
        };
      }, [filters, query, parentTimeRange, timeRange]);

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
