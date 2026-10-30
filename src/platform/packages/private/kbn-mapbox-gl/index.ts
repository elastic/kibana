/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as maplibregl from 'maplibre-gl';
import type {
  AJAXError,
  ErrorEvent,
  AttributionControlOptions,
  Map,
  LayerSpecification,
  Source,
  GeoJSONSource,
  VectorTileSource,
  RasterTileSource,
  SourceSpecification,
  StyleSpecification,
  MapOptions,
  MapMouseEvent,
  MapWheelEvent,
  MapSourceDataEvent,
  LngLat,
  LngLatBounds,
  Point2D,
  PointLike,
  MapGeoJSONFeature,
  CustomLayerInterface,
  FilterSpecification,
  FeatureIdentifier,
  ExpressionSpecification,
} from 'maplibre-gl';

import mbRtlPlugin from '@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js?asUrl';
import mbWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?asUrl';
import 'maplibre-gl/dist/maplibre-gl-shared.mjs?asUrl';
import 'maplibre-gl/dist/maplibre-gl.css';

maplibregl.setWorkerUrl(mbWorkerUrl);
maplibregl.setRTLTextPlugin(mbRtlPlugin, true);

export { maplibregl };

export type {
  AJAXError,
  ErrorEvent,
  AttributionControlOptions,
  Map,
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
  Source,
  GeoJSONSource,
  VectorTileSource,
  RasterTileSource,
  MapOptions,
  MapMouseEvent,
  MapWheelEvent,
  MapSourceDataEvent,
  LngLat,
  LngLatBounds,
  Point2D,
  PointLike,
  MapGeoJSONFeature,
  CustomLayerInterface,
  FilterSpecification,
  FeatureIdentifier,
  ExpressionSpecification,
};
