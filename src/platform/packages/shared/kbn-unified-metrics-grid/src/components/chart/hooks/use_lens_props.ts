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
import { useStableCallback } from '@kbn/unified-histogram';
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
  timeRange,
  searchSessionId,
  discoverFetch$,
  chartRef,
  chartLayers,
  yBounds,
}: {
  title: string;
  query: string;
  discoverFetch$: Observable<UnifiedHistogramInputMessage>;
  chartRef?: React.RefObject<HTMLDivElement>;
  chartLayers: LensSeriesLayer[];
  yBounds?: LensYBoundsConfig;
} & Pick<ChartSectionProps, 'services' | 'searchSessionId' | 'timeRange'>) => {
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

  const buildLensProps = useCallback(
    (attributes: LensAttributes) => {
      return getLensProps({
        searchSessionId,
        timeRange,
        attributes,
      });
    },
    [searchSessionId, timeRange]
  );

  const [lensPropsContext, setLensPropsContext] = useState<ReturnType<typeof buildLensProps>>();
  const updateLensPropsContext = useStableCallback((attributes: LensAttributes) =>
    setLensPropsContext(buildLensProps(attributes))
  );

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
    }).pipe(distinctUntilChanged(), shareReplay(1));

    // load lens props when any trigger emits;
    const triggers$ = merge(
      // dependencies that change the chart configuration
      configUpdates$,
      // discover state update
      discoverFetch$
    ).pipe(
      // any new emission cancels previous load to avoid race conditions
      switchMap(() => from(buildAttributesFn.current()))
    );

    // Update Lens props when new attributes load AND chart is visible
    // OR when chart becomes visible (using latest attributes)
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
  timeRange,
  attributes,
}: {
  searchSessionId?: string;
  attributes: LensAttributes;
} & Pick<ChartSectionProps, 'timeRange'>) => ({
  id: 'metricsExperienceLensComponent',
  viewMode: 'view' as const,
  timeRange,
  attributes,
  noPadding: true,
  searchSessionId,
  executionContext: {
    description: 'metrics experience chart data',
  },
});
