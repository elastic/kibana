/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FeatureCollection } from 'geojson';
import type { SchemaConfig } from 'src/plugins/visualizations/public';
import type { DatatableColumnMeta } from 'src/plugins/expressions';
import type { WMSOptions } from 'src/plugins/maps_legacy/public';
import type { MapTypes } from './utils/map_types';

export interface TileMapVisData {
  featureCollection: FeatureCollection;
  meta: {
    min: number;
    max: number;
    geohash?: DatatableColumnMeta;
    geohashPrecision: number | undefined;
    geohashGridDimensionsAtEquator: [number, number] | undefined;
  };
}

export interface TileMapVisDimensions {
  metric: SchemaConfig;
  geohash: SchemaConfig | null;
  geocentroid: SchemaConfig | null;
}

export interface TileMapVisParams {
  colorSchema: string;
  mapType: MapTypes;
  isDesaturated: boolean;
  addTooltip: boolean;
  heatClusterSize: number;
  legendPosition: 'bottomright' | 'bottomleft' | 'topright' | 'topleft';
  mapZoom: number;
  mapCenter: [number, number];
  wms: WMSOptions;
}

export interface TileMapVisConfig extends TileMapVisParams {
  dimensions: TileMapVisDimensions;
}
