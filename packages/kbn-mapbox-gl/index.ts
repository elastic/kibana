/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import { prepareWorkerURL } from './prepare_worker_url';

// @ts-expect-error
import mbRtlPlugin from '!!file-loader!@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js';
// @ts-expect-error
import mbWorkerUrl from '!!file-loader!maplibre-gl/dist/maplibre-gl-csp-worker';
import 'maplibre-gl/dist/maplibre-gl.css';

const maplibregl: any = maplibreglDist;

/**
 * Worker URLs must adhere to the same-origin policy.
 * See https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker.
 *
 * To satisfy the policy we construct a `blob:` URL and use the worker global `importScripts`
 * function to load the worker code via JS APIs instead.
 */
maplibregl.workerUrl = prepareWorkerURL(mbWorkerUrl);
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
