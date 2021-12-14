/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  Map,
  GeoJSONSource,
  VectorSource,
  Layer,
  AnyLayer,
  FeatureIdentifier,
  Style,
  MapboxOptions,
  MapMouseEvent,
  MapSourceDataEvent,
  LngLat,
  LngLatBounds,
  PointLike,
  MapboxGeoJSONFeature,
  Point,
  CustomLayerInterface,
} from 'maplibre-gl';
// @ts-expect-error
import mapboxglDist from 'maplibre-gl/dist/maplibre-gl-csp';
// @ts-expect-error
import mbRtlPlugin from '!!file-loader!@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js';
// @ts-expect-error
import mbWorkerUrl from '!!file-loader!maplibre-gl/dist/maplibre-gl-csp-worker';
import 'maplibre-gl/dist/maplibre-gl.css';

const mapboxgl: any = mapboxglDist;
mapboxgl.workerUrl = mbWorkerUrl;
mapboxgl.setRTLTextPlugin(mbRtlPlugin);

export { mapboxgl };

export type {
  Map,
  GeoJSONSource,
  VectorSource,
  Layer,
  AnyLayer,
  FeatureIdentifier,
  Style,
  MapboxOptions,
  MapMouseEvent,
  MapSourceDataEvent,
  LngLat,
  LngLatBounds,
  PointLike,
  MapboxGeoJSONFeature,
  Point,
  CustomLayerInterface,
};
