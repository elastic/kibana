/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AJAXError,
  Map,
  LayerSpecification,
  Source,
  GeoJSONSource,
  VectorTileSource,
  RasterTileSource,
  SourceSpecification,
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
import mbRtlPlugin from '@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js?asUrl';
import mbWorkerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker?asUrl';
import 'maplibre-gl/dist/maplibre-gl.css';

const maplibregl: any = maplibreglDist;
maplibregl.workerUrl = mbWorkerUrl;
maplibregl.setRTLTextPlugin(mbRtlPlugin);

export { maplibregl };

export type {
  AJAXError,
  Map,
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
  Source,
  GeoJSONSource,
  VectorTileSource,
  RasterTileSource,
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
