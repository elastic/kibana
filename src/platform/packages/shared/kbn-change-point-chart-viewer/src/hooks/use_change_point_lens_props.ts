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
import { useEffect, useRef, useState } from 'react';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import useLatest from 'react-use/lib/useLatest';
import { useStableCallback } from '@kbn/react-hooks';
import type { ESQLControlVariable } from '@kbn/esql-types';
import {
  catchError,
  filter,
  Observable,
  distinctUntilChanged,
  EMPTY,
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

/**
 * Builds and keeps the Lens embeddable props up-to-date for a single change point chart card.
 *
 * The hook returns `undefined` while the first build is in flight.
 *
 * Two independent signals trigger a rebuild:
 *  - `configUpdates$` — fires whenever the card's ES|QL query, title, layers, or error change.
 *  - `discoverFetch$`  — fires whenever Discover triggers a new search (time range, filters, etc.).
 *
 * Builds are skipped while the chart's DOM element is not visible in the viewport, resuming
 * automatically once it scrolls into view (IntersectionObserver, 10 % threshold).
 */
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
  /** Human-readable label shown in the Lens panel header, e.g. `"web-server-1"`. */
  title: string;
  /** The ES|QL query driving this chart (the filtered line-data sub-query). */
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

  // Signal emitted whenever any card-level config prop changes (query, title, layers, error).
  // Merged with discoverFetch$ below to form the full set of rebuild triggers.
  const chartConfigUpdates$ = useRef<BehaviorSubject<void>>(new BehaviorSubject<void>(undefined));

  useEffect(() => {
    chartConfigUpdates$.current.next(void 0);
  }, [query, title, chartLayers, error, userMessages]);

  // Wrapped in useLatest so the RxJS pipeline always invokes the most recent closure
  // (with the latest query/title/layers) without needing to be listed as a dependency —
  // adding it to deps would teardown and recreate the entire subscription on every render.
  const buildAttributesFn = useLatest(async () => {
    // Nothing to render: no layers and no error overlay.
    if (!chartLayers.length && !error) return null;

    // LensXYConfig is the high-level, framework-agnostic description of the chart.
    // Example shape for a split card with one series layer and one annotation layer:
    //
    //   {
    //     chartType: 'xy',
    //     dataset: { esql: 'FROM logs | CHANGE_POINT metric BY host.name | FORK ...' },
    //     title: 'web-server-1',
    //     description: 'host.name: web-server-1',
    //     layers: [
    //       { type: 'series', seriesType: 'line',
    //         xAxis: { type: 'dateHistogram', field: '@timestamp', minimumInterval: 'auto' },
    //         yAxis: [{ value: 'metric', label: 'metric' }] },
    //       { type: 'annotation',
    //         events: [{ name: 'step_change', datetime: '2024-01-15T12:00:00.000Z',
    //                    icon: 'triangle', color: '#BD271E' }] }
    //     ],
    //     legend: { show: false },
    //     fittingFunction: 'Linear',
    //   }
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

    // builder.build() compiles LensXYConfig → LensSavedObjectAttributes (the full Lens document).
    // Example result shape:
    //
    //   {
    //     title: 'web-server-1',
    //     description: 'host.name: web-server-1',   // set below when description is provided
    //     visualizationType: 'lnsXY',
    //     state: {
    //       datasourceStates: { textBased: { layers: { '<uuid>': { query: { esql: '...' } } } } },
    //       visualization: { layers: [...], fittingFunction: 'Linear', ... },
    //       query: { esql: '...' },
    //       filters: [],
    //     },
    //     references: [],
    //   }
    const result = (await builder.build(lensParams, {
      query: {
        esql: (lensParams.dataset as LensESQLDataset).esql,
      },
    })) as LensAttributes;

    return result;
  });

  const [lensPropsContext, setLensPropsContext] = useState<ChangePointLensProps>();

  // useStableCallback always invokes the latest closure, so fetchParams / timeRangeOverride
  // values are always current without needing a dep array (unlike useCallback).
  const updateLensPropsContext = useStableCallback((attributes: LensAttributes) =>
    setLensPropsContext(
      getChangePointLensProps({
        id: lensInstanceId,
        searchSessionId: fetchParams.searchSessionId,
        timeRange: timeRangeOverride ?? fetchParams.relativeTimeRange,
        esqlVariables: fetchParams.esqlVariables,
        attributes,
        lastReloadRequestTime: fetchParams.lastReloadRequestTime,
        userMessages,
      })
    )
  );

  useEffect(() => {
    const chartRefCurrent = chartRef?.current;
    const configUpdates$ = chartConfigUpdates$.current;

    // Emits true/false as the chart scrolls in/out of the viewport.
    // When no DOM ref is provided (e.g. in tests) we emit true immediately and complete,
    // so every trigger results in a build.
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

    // triggers$ fires on every config change or Discover fetch, then immediately
    // calls buildAttributesFn to produce the updated LensAttributes.
    const triggers$ = merge(configUpdates$, discoverFetch$).pipe(
      switchMap(() =>
        from(buildAttributesFn.current()).pipe(
          // Catch synchronous throws and Promise rejections from the builder inside the inner
          // observable so errors do not propagate to the outer subscription and terminate it.
          // EMPTY completes the inner stream without emitting, keeping triggers$ alive for the
          // next emission from configUpdates$ or discoverFetch$.
          catchError((err) => {
            // eslint-disable-next-line no-console
            console.error('[useChangePointLensProps] Failed to build Lens attributes', err);
            return EMPTY;
          })
        )
      ),
      filter((attributes): attributes is LensAttributes => attributes !== null)
    );

    // Only update the rendered props when both a fresh set of attributes is available AND
    // the chart is currently visible — avoids building Lens expressions for off-screen cards.
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
