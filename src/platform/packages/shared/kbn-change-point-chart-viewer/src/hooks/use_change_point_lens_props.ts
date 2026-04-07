/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  LensAttributes,
  LensESQLDataset,
  LensXYConfig,
} from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { useEuiTheme } from '@elastic/eui';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import useLatest from 'react-use/lib/useLatest';
import { useStableCallback } from '@kbn/react-hooks';
import type { ESQLControlVariable } from '@kbn/esql-types';
import {
  filter,
  Observable,
  distinctUntilChanged,
  from,
  merge,
  shareReplay,
  BehaviorSubject,
  switchMap,
  combineLatest,
  map,
} from 'rxjs';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { UnifiedChangePointGridProps } from '../types';

export type ChangePointLensProps = Pick<
  EmbeddableComponentProps,
  | 'id'
  | 'viewMode'
  | 'timeRange'
  | 'attributes'
  | 'esqlVariables'
  | 'noPadding'
  | 'searchSessionId'
  | 'executionContext'
  | 'onLoad'
  | 'lastReloadRequestTime'
  | 'userMessages'
>;

export const useChangePointLensProps = ({
  lensInstanceId,
  title,
  query,
  services,
  fetchParams,
  discoverFetch$,
  chartRef,
  chartLayers,
  timeRange: timeRangeOverride,
  error,
  userMessages,
}: {
  lensInstanceId: string;
  title: string;
  query: string;
  discoverFetch$: UnifiedChangePointGridProps['fetch$'];
  chartRef?: React.RefObject<HTMLDivElement>;
  chartLayers: LensXYConfig['layers'];
  /** Override the chart time range, e.g. to include annotation timestamps outside the fetch range. */
  timeRange?: TimeRange;
  error?: Error;
  userMessages?: EmbeddableComponentProps['userMessages'];
} & Pick<UnifiedChangePointGridProps, 'services' | 'fetchParams'>) => {
  const { euiTheme } = useEuiTheme();
  const chartConfigUpdates$ = useRef<BehaviorSubject<void>>(new BehaviorSubject<void>(undefined));

  useEffect(() => {
    chartConfigUpdates$.current.next(void 0);
  }, [query, title, chartLayers, error, userMessages]);

  const buildAttributesFn = useLatest(async () => {
    if (!chartLayers.length && !error) return null;

    const lensParams: LensXYConfig = {
      chartType: 'xy',
      dataset: {
        esql: query,
      },
      title,
      legend: {
        show: false,
      },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
        showYRightAxisTitle: false,
      },
      layers: chartLayers,
      fittingFunction: 'Linear',
    };

    const builder = new LensConfigBuilder(services.dataViews);

    const result = (await builder.build(lensParams, {
      query: {
        esql: (lensParams.dataset as LensESQLDataset).esql,
      },
    })) as LensAttributes;

    return result;
  });

  const buildLensProps = useCallback(
    (attributes: LensAttributes) =>
      getChangePointLensProps({
        id: lensInstanceId,
        searchSessionId: fetchParams.searchSessionId,
        timeRange: timeRangeOverride ?? fetchParams.relativeTimeRange,
        esqlVariables: fetchParams.esqlVariables,
        attributes,
        lastReloadRequestTime: fetchParams.lastReloadRequestTime,
        userMessages,
      }),
    [
      lensInstanceId,
      fetchParams.searchSessionId,
      timeRangeOverride,
      fetchParams.relativeTimeRange,
      fetchParams.lastReloadRequestTime,
      fetchParams.esqlVariables,
      userMessages,
    ]
  );

  const [lensPropsContext, setLensPropsContext] = useState<ReturnType<typeof buildLensProps>>();
  const updateLensPropsContext = useStableCallback((attributes: LensAttributes) =>
    setLensPropsContext(buildLensProps(attributes))
  );

  useEffect(() => {
    const chartRefCurrent = chartRef?.current;
    const configUpdates$ = chartConfigUpdates$.current;

    const intersecting$ = new Observable<boolean>((subscriber) => {
      const observer = new IntersectionObserver(
        ([entry]) => subscriber.next(entry.isIntersecting),
        { threshold: 0.1, rootMargin: euiTheme.size.base }
      );

      if (chartRefCurrent) {
        observer.observe(chartRefCurrent);
      } else {
        subscriber.next(true);
        subscriber.complete();
      }

      return () => observer.disconnect();
    }).pipe(distinctUntilChanged(), shareReplay(1));

    const triggers$ = merge(configUpdates$, discoverFetch$).pipe(
      switchMap(() => from(buildAttributesFn.current())),
      filter((attributes): attributes is LensAttributes => attributes !== null)
    );

    const subscription = combineLatest([triggers$, intersecting$])
      .pipe(
        filter(([, isIntersecting]) => isIntersecting),
        map(([attributes]) => attributes)
      )
      .subscribe((attributes) => {
        updateLensPropsContext(attributes);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [discoverFetch$, buildAttributesFn, updateLensPropsContext, chartRef, euiTheme.size.base]);

  return lensPropsContext;
};

const getChangePointLensProps = ({
  id,
  searchSessionId,
  timeRange,
  attributes,
  lastReloadRequestTime,
  esqlVariables,
  userMessages,
}: {
  id: string;
  searchSessionId?: string;
  attributes: LensAttributes;
  esqlVariables: ESQLControlVariable[] | undefined;
  timeRange: TimeRange;
  lastReloadRequestTime?: number;
  userMessages?: EmbeddableComponentProps['userMessages'];
}): ChangePointLensProps => ({
  id,
  viewMode: 'view',
  timeRange,
  attributes,
  noPadding: true,
  esqlVariables,
  searchSessionId,
  executionContext: {
    description: 'change point chart viewer',
  },
  lastReloadRequestTime,
  userMessages,
});
