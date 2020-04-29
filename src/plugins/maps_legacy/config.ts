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

import { schema, TypeOf } from '@kbn/config-schema';
import { configSchema as tilemapSchema } from '../tile_map/config';

// TODO: Pull this portion from region_map
export const regionmapSchema = schema.object({
  includeElasticMapsService: schema.boolean({ defaultValue: true }),
  layers: schema.arrayOf(
    schema.object({
      url: schema.string(),
      format: schema.object({
        type: schema.string({ defaultValue: 'geojson' }),
      }),
      meta: schema.object({
        feature_collection_path: schema.string({ defaultValue: 'data' }),
      }),
      attribution: schema.string(),
      name: schema.string(),
      fields: schema.arrayOf(
        schema.object({
          name: schema.string(),
          description: schema.string(),
        })
      ),
    }),
    { defaultValue: [] }
  ),
});

export const configSchema = schema.object({
  includeElasticMapsService: schema.boolean({ defaultValue: true }),
  proxyElasticMapsServiceInMaps: schema.boolean({ defaultValue: false }),
  tilemap: tilemapSchema,
  regionmap: regionmapSchema,
  manifestServiceUrl: schema.string({ defaultValue: '' }),
  emsFileApiUrl: schema.string({ defaultValue: 'https://vector.maps.elastic.co' }),
  emsTileApiUrl: schema.string({ defaultValue: 'https://tiles.maps.elastic.co' }),
  emsLandingPageUrl: schema.string({ defaultValue: 'https://maps.elastic.co/v7.7' }),
  emsFontLibraryUrl: schema.string({
    defaultValue: 'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf',
  }),
  emsTileLayerId: schema.object({
    bright: schema.string({ defaultValue: 'road_map' }),
    desaturated: schema.string({ defaultValue: 'road_map_desaturated' }),
    dark: schema.string({ defaultValue: 'dark_map' }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
