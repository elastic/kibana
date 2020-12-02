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

import type { SchemaConfig } from 'src/plugins/visualizations/public';
import type { DatatableColumnMeta } from 'src/plugins/expressions';
import type { TileMapVisParams } from 'src/plugins/maps_legacy/public';

export interface Feature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    geohash: string;
    geohash_meta: {
      center: [number, number];
      rectangle: Array<[number, number]>;
    };
    value: number;
  };
}

export interface TileMapVisData {
  featureCollection: {
    type: 'FeatureCollection';
    features: Feature[];
  };
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

export interface TileMapVisConfig extends TileMapVisParams {
  dimensions: TileMapVisDimensions;
}
