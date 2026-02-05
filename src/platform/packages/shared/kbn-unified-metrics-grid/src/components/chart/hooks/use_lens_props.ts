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
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import useLatest from 'react-use/lib/useLatest';
import { useStableCallback } from '@kbn/unified-histogram';
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
import { useEuiTheme } from '@elastic/eui';
import type {
  LensYBoundsConfig,
  LensESQLDataset,
} from '@kbn/lens-embeddable-utils/config_builder/types';
import type { UnifiedMetricsGridProps } from '../../../types';

export type LensProps = Pick<
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
>;

export const useLensProps = ({
  title,
  query,
  services,
  fetchParams,
  discoverFetch$,
  chartRef,
  chartLayers,
  yBounds,
  error,
}: {
  title: string;
  query: string;
  discoverFetch$: UnifiedMetricsGridProps['fetch$'];
  chartRef?: React.RefObject<HTMLDivElement>;
  chartLayers: LensSeriesLayer[];
  yBounds?: LensYBoundsConfig;
  error?: Error;
} & Pick<UnifiedMetricsGridProps, 'services' | 'fetchParams'>) => {
  const { euiTheme } = useEuiTheme();
  const chartConfigUpdates$ = useRef<BehaviorSubject<void>>(new BehaviorSubject<void>(undefined));

  useEffect(() => {
    chartConfigUpdates$.current.next(void 0);
  }, [query, title, chartLayers, yBounds, error]);

  // creates a stable function that builds the Lens attributes
  const buildAttributesFn = useLatest(async () => {
    // keep Lens from building if there are no chart layers and no error
    // force Lens to build with no datasource on error to show the error message
    if (!chartLayers.length && !error) return null;

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
        searchSessionId: fetchParams.searchSessionId,
        timeRange: fetchParams.relativeTimeRange, // same as in the time picker
        esqlVariables: fetchParams.esqlVariables,
        attributes,
        lastReloadRequestTime: fetchParams.lastReloadRequestTime,
      });
    },
    [
      fetchParams.searchSessionId,
      fetchParams.relativeTimeRange,
      fetchParams.lastReloadRequestTime,
      fetchParams.esqlVariables,
    ]
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
      switchMap(() => from(buildAttributesFn.current())),
      filter((attributes): attributes is LensAttributes => attributes !== null)
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
  lastReloadRequestTime,
  esqlVariables,
}: {
  searchSessionId?: string;
  attributes: LensAttributes;
  esqlVariables: ESQLControlVariable[] | undefined;
  timeRange: TimeRange;
  lastReloadRequestTime?: number;
}): LensProps => ({
  id: 'metricsExperienceLensComponent',
  viewMode: 'view',
  timeRange,
  attributes,
  noPadding: true,
  esqlVariables,
  searchSessionId,
  executionContext: {
    description: 'metrics experience chart data',
  },
  lastReloadRequestTime,
});
