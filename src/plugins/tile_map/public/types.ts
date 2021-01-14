/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
