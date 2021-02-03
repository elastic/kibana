/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import {
  DEFAULT_EMS_FONT_LIBRARY_URL,
  DEFAULT_EMS_LANDING_PAGE_URL,
  DEFAULT_EMS_TILE_API_URL,
  DEFAULT_EMS_FILE_API_URL,
} from './common/ems_defaults';

export const tilemapConfigSchema = schema.object({
  url: schema.maybe(schema.string()),
  options: schema.object({
    attribution: schema.string({ defaultValue: '' }),
    minZoom: schema.number({ defaultValue: 0, min: 0 }),
    maxZoom: schema.number({ defaultValue: 10 }),
    tileSize: schema.maybe(schema.number()),
    subdomains: schema.maybe(schema.arrayOf(schema.string())),
    errorTileUrl: schema.maybe(schema.string()),
    tms: schema.maybe(schema.boolean()),
    reuseTiles: schema.maybe(schema.boolean()),
    bounds: schema.maybe(schema.arrayOf(schema.number({ min: 2 }))),
    default: schema.maybe(schema.boolean()),
  }),
});

const layerConfigSchema = schema.object({
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
});

export type LayerConfig = TypeOf<typeof layerConfigSchema>;

export const regionmapConfigSchema = schema.object({
  includeElasticMapsService: schema.boolean({ defaultValue: true }),
  layers: schema.arrayOf(layerConfigSchema, { defaultValue: [] }),
});

export const configSchema = schema.object({
  includeElasticMapsService: schema.boolean({ defaultValue: true }),
  proxyElasticMapsServiceInMaps: schema.boolean({ defaultValue: false }),
  tilemap: tilemapConfigSchema,
  regionmap: regionmapConfigSchema,
  manifestServiceUrl: schema.string({ defaultValue: '' }),

  emsUrl: schema.conditional(
    schema.siblingRef('proxyElasticMapsServiceInMaps'),
    true,
    schema.never(),
    schema.string({ defaultValue: '' })
  ),

  emsFileApiUrl: schema.string({ defaultValue: DEFAULT_EMS_FILE_API_URL }),
  emsTileApiUrl: schema.string({ defaultValue: DEFAULT_EMS_TILE_API_URL }),
  emsLandingPageUrl: schema.string({ defaultValue: DEFAULT_EMS_LANDING_PAGE_URL }),
  emsFontLibraryUrl: schema.string({
    defaultValue: DEFAULT_EMS_FONT_LIBRARY_URL,
  }),

  emsTileLayerId: schema.object({
    bright: schema.string({ defaultValue: 'road_map' }),
    desaturated: schema.string({ defaultValue: 'road_map_desaturated' }),
    dark: schema.string({ defaultValue: 'dark_map' }),
  }),
});

export type MapsLegacyConfig = TypeOf<typeof configSchema>;
