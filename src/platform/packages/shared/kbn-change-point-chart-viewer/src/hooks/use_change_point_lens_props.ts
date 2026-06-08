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
 * Returns `undefined` while the first build is in flight (renders a loading state).
 *
 * Two independent signals trigger a rebuild:
 *  - `chartConfigUpdates$` — fires whenever the card's ES|QL query, title, layers, description,
 *    or error change (i.e. any input that affects the compiled Lens attributes).
 *  - `discoverFetch$` — fires whenever Discover triggers a new search (time range, filters, etc.).
 *    This observable must be a **stable reference**: a new identity on each render restarts the
 *    RxJS subscription, which immediately triggers a rebuild loop via the BehaviorSubject.
 *
 * Builds are skipped while the chart is not visible in the viewport and resume automatically once
 * it scrolls into view (IntersectionObserver, 10% threshold). This avoids building Lens
 * expressions for the many off-screen cards in a paginated grid.
 *
 * `switchMap` ensures only the latest build is ever applied: if a new trigger arrives while
 * `builder.build()` is still awaiting, the in-flight result is discarded.
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
  description,
}: {
  lensInstanceId: string;
  /** Human-readable label shown in the Lens panel header, e.g. `"web-server-1"`. */
  title: string;
  /** The ES|QL query driving this chart (the entity-filtered line-data sub-query). */
  query: string;
  /**
   * Emits whenever Discover executes a new search (time range change, filter change, etc.).
   *
   * **Must be a stable reference** (e.g. created once outside the render function). A new
   * reference on every render restarts the RxJS subscription on each re-render, which triggers
   * an immediate BehaviorSubject emission → rebuild → `setLensPropsContext` → re-render loop.
   */
  discoverFetch$: UnifiedChangePointGridProps['fetch$'];
  /** Ref to the chart's wrapper element used for viewport visibility detection. When omitted (e.g. in tests), builds run unconditionally. */
  chartRef?: React.RefObject<HTMLDivElement>;
  /** Lens XY layer config: one series layer plus an optional annotation layer. */
  chartLayers: LensXYConfig['layers'];
  /** Overrides the Discover global time range, e.g. to include annotation timestamps that fall before the range start. */
  timeRange?: TimeRange;
  /** When set, renders an error overlay via Lens `userMessages` instead of the chart. */
  error?: Error;
  userMessages?: EmbeddableComponentProps['userMessages'];
  /** Optional Lens panel description (e.g. entity identity). Forwarded to `LensAttributes.description` for use as case-attachment metadata. */
  description?: string;
} & Pick<UnifiedChangePointGridProps, 'services' | 'fetchParams'>) => {
  const { euiTheme } = useEuiTheme();
  // Captured once — used only as IntersectionObserver rootMargin and does not need to cause the
  // subscription to be torn down and recreated when the theme changes.
  const rootMarginRef = useRef(euiTheme.size.base);

  // Emits whenever any prop that affects the compiled Lens attributes changes, bridging React's
  // render cycle into the RxJS pipeline without recreating the subscription. A BehaviorSubject
  // is used (rather than a plain Subject) so the initial emission fires immediately on mount,
  // triggering the first build without waiting for an external event.
  const chartConfigUpdates$ = useRef<BehaviorSubject<void>>(new BehaviorSubject<void>(undefined));

  useEffect(() => {
    chartConfigUpdates$.current.next(void 0);
  }, [query, title, description, chartLayers, error, userMessages]);

  // useLatest keeps `.current` pointing to the latest closure on every render. The RxJS
  // subscription reads `buildAttributesFn.current()` — so it always sees fresh prop values —
  // without the ref's stable identity ever causing the subscription to be torn down.
  const buildAttributesFn = useLatest(async () => {
    if (!chartLayers.length && !error) return null;

    const lensParams: LensXYConfig = {
      chartType: 'xy',
      dataset: { esql: query },
      title,
      legend: { show: false },
      axisTitleVisibility: {
        showXAxisTitle: false,
        showYAxisTitle: false,
        showYRightAxisTitle: false,
      },
      layers: chartLayers,
      fittingFunction: 'Linear',
    };

    // builder.build() compiles the high-level LensXYConfig into a full LensSavedObjectAttributes
    // document (visualizationType, datasourceStates, visualization, query, filters, references).
    const result = (await new LensConfigBuilder(services.dataViews).build(lensParams, {
      query: { esql: (lensParams.dataset as LensESQLDataset).esql },
    })) as LensAttributes;

    // LensConfigBuilder does not expose a description field in its config; set it directly on
    // the built attributes so it is available as case-attachment metadata.
    if (description) {
      result.description = description;
    }

    return result;
  });

  const [lensPropsContext, setLensPropsContext] = useState<ChangePointLensProps>();
  const [buildError, setBuildError] = useState<Error | undefined>();

  // useStableCallback always invokes the latest closure, so fetchParams and timeRangeOverride
  // are always current even though this callback is only created once (stable identity).
  const updateLensPropsContext = useStableCallback((attributes: LensAttributes) =>
    setLensPropsContext(
      getChangePointLensProps({
        id: lensInstanceId,
        searchSessionId: fetchParams.searchSessionId,
        // timeRangeOverride may extend the Discover range backward to include early annotations;
        // Lens must fetch that extended range so those annotations are actually visible in the chart.
        // Falls back to fetchParams.timeRange — the resolved absolute range from the last Discover
        // fetch — matching the unified histogram pattern (use_lens_props.ts).
        timeRange: timeRangeOverride ?? fetchParams.timeRange,
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
        { threshold: 0.1, rootMargin: rootMarginRef.current }
      );

      if (chartRefCurrent) {
        observer.observe(chartRefCurrent);
      } else {
        subscriber.next(true);
        subscriber.complete();
      }

      return () => observer.disconnect();
      // refCount:true ensures observer.disconnect() runs when combineLatest unsubscribes on unmount.
    }).pipe(distinctUntilChanged(), shareReplay({ bufferSize: 1, refCount: true }));

    // On every config change or Discover fetch, kick off a new async build. switchMap cancels any
    // in-flight build so only the result of the latest trigger is ever applied.
    const triggers$ = merge(configUpdates$, discoverFetch$).pipe(
      switchMap(() =>
        from(buildAttributesFn.current()).pipe(
          // Errors inside builder.build() must be caught here (inside the inner observable) so
          // they don't terminate the outer subscription. EMPTY discards the failed build and
          // leaves the subscription alive for the next trigger.
          catchError((err) => {
            // eslint-disable-next-line no-console
            console.error('[useChangePointLensProps] Failed to build Lens attributes', err);
            // Surface the error so the component can render an error state instead of an
            // infinite spinner. setBuildError is a stable React setter — safe to call here.
            setBuildError(err instanceof Error ? err : new Error(String(err)));
            return EMPTY;
          })
        )
      ),
      filter((attributes): attributes is LensAttributes => attributes !== null)
    );

    // Gate state updates on viewport visibility. combineLatest re-emits whenever either source
    // emits, so a build result that arrives while the chart is off-screen is held until the
    // chart scrolls into view and intersecting$ emits true.
    const subscription = combineLatest([triggers$, intersecting$])
      .pipe(
        filter(([, isIntersecting]) => isIntersecting),
        map(([attributes]) => attributes)
      )
      .subscribe((attributes) => {
        // Clear any previous build error so the component transitions from error → chart.
        setBuildError(undefined);
        updateLensPropsContext(attributes);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [discoverFetch$, buildAttributesFn, updateLensPropsContext, chartRef]);

  return { lensProps: lensPropsContext, buildError };
};

export const getChangePointLensProps = ({
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
