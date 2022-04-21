/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  Map,
  LayerSpecification,
  Source,
  GeoJSONSource,
  VectorTileSource,
  StyleSpecification,
  MapEvent,
  MapOptions,
  MapMouseEvent,
  MapSourceDataEvent,
  LngLat,
  LngLatBounds,
  Point2D,
  PointLike,
  MapGeoJSONFeature,
  CustomLayerInterface,
  FilterSpecification,
  FeatureIdentifier,
} from 'maplibre-gl';

// @ts-expect-error
import maplibreglDist from 'maplibre-gl/dist/maplibre-gl-csp';
// @ts-expect-error
import mbRtlPlugin from '!!file-loader!@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js';
// @ts-expect-error
import mbWorkerUrl from '!!file-loader!maplibre-gl/dist/maplibre-gl-csp-worker';
import 'maplibre-gl/dist/maplibre-gl.css';

const maplibregl: any = maplibreglDist;
maplibregl.workerUrl = mbWorkerUrl;
maplibregl.setRTLTextPlugin(mbRtlPlugin);

export { maplibregl };

export type {
  Map,
  LayerSpecification,
  StyleSpecification,
  Source,
  GeoJSONSource,
  VectorTileSource,
  MapEvent,
  MapOptions,
  MapMouseEvent,
  MapSourceDataEvent,
  LngLat,
  LngLatBounds,
  Point2D,
  PointLike,
  MapGeoJSONFeature,
  CustomLayerInterface,
  FilterSpecification,
  FeatureIdentifier,
};
