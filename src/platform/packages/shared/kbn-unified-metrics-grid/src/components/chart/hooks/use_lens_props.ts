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
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import useLatest from 'react-use/lib/useLatest';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useStableCallback } from '@kbn/unified-histogram';
import {
  debounceTime,
  filter,
  startWith,
  Observable,
  distinctUntilChanged,
  withLatestFrom,
  from,
  merge,
  shareReplay,
  BehaviorSubject,
  switchMap,
  defer,
} from 'rxjs';
import type { TimeRange } from '@kbn/data-plugin/common';
import { useEuiTheme } from '@elastic/eui';
import type {
  LensYBoundsConfig,
  LensESQLDataset,
} from '@kbn/lens-embeddable-utils/config_builder/types';
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
  services,
  getTimeRange,
  searchSessionId,
  discoverFetch$,
  chartRef,
  chartLayers,
  yBounds,
}: {
  title: string;
  query: string;
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
  getTimeRange: () => TimeRange;
  chartRef?: React.RefObject<HTMLDivElement>;
  chartLayers: LensSeriesLayer[];
  yBounds?: LensYBoundsConfig;
} & Pick<ChartSectionProps, 'services' | 'searchSessionId'>) => {
  const { euiTheme } = useEuiTheme();
  const chartConfigUpdates$ = useRef<BehaviorSubject<void>>(new BehaviorSubject<void>(undefined));

  useEffect(() => {
    chartConfigUpdates$.current.next(void 0);
  }, [query, title, chartLayers, yBounds]);

  // creates a stable function that builds the Lens attributes
  const buildAttributesFn = useLatest(async () => {
    const lensParams = buildLensParams({ query, title, chartLayers, yBounds });
    const builder = new LensConfigBuilder(services.dataViews);

    const result = (await builder.build(lensParams, {
      query: {
        esql: (lensParams.dataset as LensESQLDataset).esql,
      },
    })) as LensAttributes;
    return result;
  });

  // loads the Lens attributes
  const [attributesState, loadAttributes] = useAsyncFn(
    () => buildAttributesFn.current(),
    [buildAttributesFn]
  );

  const buildLensProps = useCallback(() => {
    if (!attributesState.value) {
      return;
    }
    return getLensProps({
      searchSessionId,
      getTimeRange,
      attributes: attributesState.value,
    });
  }, [searchSessionId, attributesState, getTimeRange]);

  const [lensPropsContext, setLensPropsContext] = useState<ReturnType<typeof buildLensProps>>();
  const updateLensPropsContext = useStableCallback(() => setLensPropsContext(buildLensProps()));

  useEffect(() => {
    const chartRefCurrent = chartRef?.current;
    const configUpdates$ = chartConfigUpdates$.current;

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
    }).pipe(startWith(!!chartRefCurrent), distinctUntilChanged(), shareReplay(1));

    // load lens props when any trigger emits;
    const triggers$ = merge(
      // dependencies that change the chart configuration
      configUpdates$.pipe(debounceTime(100)),
      // discover state update
      discoverFetch$
    ).pipe(
      // any new emission cancels previous load to avoid race conditions
      switchMap(() => from(loadAttributes()))
    );
    // Update Lens props only when chart is visible
    const subscription = merge(
      // initial load on mount
      defer(() => from(loadAttributes())),
      triggers$,
      intersecting$
    )
      .pipe(
        // debounce to avoid multiple updates in quick succession
        debounceTime(100),
        withLatestFrom(intersecting$),
        filter(([, isIntersecting]) => isIntersecting)
      )
      .subscribe(() => {
        updateLensPropsContext();
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [discoverFetch$, loadAttributes, updateLensPropsContext, chartRef, euiTheme.size.base]);

  return lensPropsContext;
};

const buildLensParams = ({
  query,
  title,
  chartLayers,
  yBounds,
}: {
  query: string;
  title: string;
  chartLayers: LensSeriesLayer[];
  yBounds?: LensYBoundsConfig;
}): LensConfig => {
  return {
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
    yBounds,
  };
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
