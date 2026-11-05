/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subscription, distinctUntilChanged, skip, type Observable } from 'rxjs';
import type { AggregateQuery } from '@kbn/es-query';
import { getGeoPrecisionParamValues } from '@kbn/esql-utils';
import type { VegaMapPosition, VegaRenderDescriptor } from '../data_model/types';

type GeoPrecisionValues = ReturnType<typeof getGeoPrecisionParamValues>;

const getPrecisions = (queries: AggregateQuery[], zoom: number): GeoPrecisionValues[] =>
  queries.map(({ esql }) => getGeoPrecisionParamValues(esql, zoom));

const usesGeoPrecisionParam = (precisions: GeoPrecisionValues[]) =>
  precisions.some((values) => Object.keys(values).length > 0);

/**
 * Tracks the position reported by the Vega map view. A report triggers a refetch
 * (`mapViewChange$`) only when it changes the geo precisions of ES|QL queries compared to the
 * last fetch.
 */
export function initializeGeoPrecisionManager({
  spec$,
  esql$,
  visData$,
}: {
  /**
   * A new spec starts from its own map position and zoom. Create the manager before any
   * subscription that fetches on `spec$`, so the reset runs before the fetch reads the map view.
   */
  spec$: Observable<unknown>;
  esql$: Observable<AggregateQuery[]>;
  visData$: Observable<VegaRenderDescriptor | undefined>;
}) {
  let mapView: VegaMapPosition | undefined;
  // Precisions the displayed data was fetched with. Undefined until the map reports a position,
  // in which case the zoom of the render descriptor is used.
  let fetchedPrecisions: GeoPrecisionValues[] | undefined;
  const mapViewChange$ = new BehaviorSubject<void>(undefined);
  let queries: AggregateQuery[] = [];
  let visData: VegaRenderDescriptor | undefined;
  const subscription = new Subscription();
  subscription.add(
    spec$.pipe(distinctUntilChanged(), skip(1)).subscribe(() => {
      mapView = undefined;
    })
  );
  subscription.add(
    esql$.subscribe((nextQueries) => {
      queries = nextQueries;
    })
  );
  subscription.add(
    visData$.subscribe((nextVisData) => {
      visData = nextVisData;
    })
  );

  return {
    mapViewChange$,
    /** Latest position reported by the map view. */
    getMapView: () => mapView,
    /** Call when a fetch starts so later reports are compared to the precisions the fetch used. */
    onFetch: () => {
      fetchedPrecisions = mapView ? getPrecisions(queries, mapView.zoom) : undefined;
    },
    onMapViewChange: (view: VegaMapPosition) => {
      mapView = view;
      if (!visData?.useMap) return;
      const nextPrecisions = getPrecisions(queries, view.zoom);
      if (!usesGeoPrecisionParam(nextPrecisions)) return;
      const prevPrecisions =
        fetchedPrecisions ?? getPrecisions(queries, visData.mapConfig?.zoom ?? 0);
      if (JSON.stringify(prevPrecisions) !== JSON.stringify(nextPrecisions)) {
        mapViewChange$.next();
      }
    },
    cleanup: () => subscription.unsubscribe(),
  };
}
