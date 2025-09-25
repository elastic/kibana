/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes, LensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigBuilder, type LensSeriesLayer } from '@kbn/lens-embeddable-utils/config_builder';
import type { ChartSectionProps, UnifiedHistogramInputMessage } from '@kbn/unified-histogram/types';
import useAsync from 'react-use/lib/useAsync';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import { useStableCallback } from '@kbn/unified-histogram';
import {
  BehaviorSubject,
  debounceTime,
  filter,
  merge,
  withLatestFrom,
  startWith,
  Observable,
  distinctUntilChanged,
} from 'rxjs';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { MetricUnit } from '@kbn/metrics-experience-plugin/common/types';
import { useEuiTheme } from '@elastic/eui';
import { useChartLayers } from './use_chart_layers';
export type LensProps = Pick<
  EmbeddableComponentProps,
  | 'id'
  | 'viewMode'
  | 'timeRange'
  | 'attributes'
  | 'noPadding'
  | 'searchSessionId'
  | 'executionContext'
  | 'onLoad'
>;

export const useLensProps = ({
  title,
  query,
  seriesType,
  services,
  getTimeRange,
  unit,
  color,
  searchSessionId,
  discoverFetch$,
  abortController,
  chartRef,
}: {
  title: string;
  query: string;
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
  color?: string;
  unit?: MetricUnit;
  getTimeRange: () => TimeRange;
  seriesType: LensSeriesLayer['seriesType'];
  chartRef?: React.RefObject<HTMLDivElement>;
  abortController?: AbortController;
} & Pick<ChartSectionProps, 'services' | 'searchSessionId'>) => {
  const { euiTheme } = useEuiTheme();
  const chartLayers = useChartLayers({
    query,
    seriesType,
    services,
    getTimeRange,
    unit,
    color,
    abortController,
  });

  const attributes$ = useRef(new BehaviorSubject<LensAttributes | undefined>(undefined));
  const lensParams = useMemo<LensConfig | undefined>(
    () =>
      chartLayers.length > 0
        ? {
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
          }
        : undefined,
    [query, title, chartLayers]
  );

  useAsync(async () => {
    if (!lensParams) {
      attributes$.current.next(undefined);
      return;
    }

    const builder = new LensConfigBuilder(services.dataViews);

    attributes$.current.next(
      (await builder.build(lensParams, {
        query: {
          esql: query,
        },
      })) as LensAttributes
    );
  }, [lensParams, query, services.dataViews]);

  const buildLensProps = useCallback(() => {
    if (!attributes$.current.value) {
      return;
    }

    return getLensProps({
      searchSessionId,
      getTimeRange,
      attributes: attributes$.current.value,
    });
  }, [searchSessionId, getTimeRange]);

  const [lensPropsContext, setLensPropsContext] = useState<ReturnType<typeof buildLensProps>>();
  const updateLensPropsContext = useStableCallback(() => setLensPropsContext(buildLensProps()));

  useEffect(() => {
    const attributesCurrent = attributes$.current;
    const chartRefCurrent = chartRef?.current;

    // progressively load Lens when the chart becomes visible
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
    }).pipe(startWith(!!chartRefCurrent), distinctUntilChanged());

    const subscription = merge(
      discoverFetch$,
      // Emit the current attributes value immediately to handle cases where
      // attributes are already set but discoverFetch$ emitted before this hook mounted.
      // This ensures we don't miss an update that occurred between unmount and mount.
      attributesCurrent.pipe(startWith(attributesCurrent.value)),
      intersecting$
    )
      .pipe(
        // prevent rapid successive updates
        debounceTime(100),
        withLatestFrom(attributesCurrent, intersecting$),
        filter(([, attr, isIntersecting]) => {
          return !!attr && isIntersecting;
        })
      )
      .subscribe(() => updateLensPropsContext());

    return () => {
      subscription.unsubscribe();
    };
  }, [discoverFetch$, updateLensPropsContext, chartRef, euiTheme.size.base]);

  return lensPropsContext;
};

const getLensProps = ({
  searchSessionId,
  getTimeRange,
  attributes,
}: {
  searchSessionId?: string;
  attributes: LensAttributes;
  getTimeRange: () => TimeRange;
}): LensProps => ({
  id: 'metricsExperienceLensComponent',
  viewMode: 'view',
  timeRange: getTimeRange(),
  attributes,
  noPadding: true,
  searchSessionId,
  executionContext: {
    description: 'metrics experience chart data',
  },
});
