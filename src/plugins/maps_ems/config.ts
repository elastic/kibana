/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import {
  DEFAULT_EMS_FONT_LIBRARY_URL,
  DEFAULT_EMS_LANDING_PAGE_URL,
  DEFAULT_EMS_TILE_API_URL,
  DEFAULT_EMS_FILE_API_URL,
  DEFAULT_EMS_ROADMAP_ID,
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_DARKMAP_ID,
} from './common';

const tileMapConfigOptionsSchema = schema.object({
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
});

export const tilemapConfigSchema = schema.object({
  url: schema.maybe(schema.string()),
  options: tileMapConfigOptionsSchema,
});

export const mapConfigSchema = schema.object({
  tilemap: tilemapConfigSchema,
  includeElasticMapsService: schema.boolean({ defaultValue: true }),
  emsUrl: schema.string({ defaultValue: '' }),
  emsFileApiUrl: schema.string({ defaultValue: DEFAULT_EMS_FILE_API_URL }),
  emsTileApiUrl: schema.string({ defaultValue: DEFAULT_EMS_TILE_API_URL }),
  emsLandingPageUrl: schema.string({ defaultValue: DEFAULT_EMS_LANDING_PAGE_URL }),
  emsFontLibraryUrl: schema.string({
    defaultValue: DEFAULT_EMS_FONT_LIBRARY_URL,
  }),
  emsTileLayerId: schema.object({
    bright: schema.string({ defaultValue: DEFAULT_EMS_ROADMAP_ID }),
    desaturated: schema.string({ defaultValue: DEFAULT_EMS_ROADMAP_DESATURATED_ID }),
    dark: schema.string({ defaultValue: DEFAULT_EMS_DARKMAP_ID }),
  }),
});

export type MapConfig = TypeOf<typeof mapConfigSchema>;
export type TileMapConfig = TypeOf<typeof tilemapConfigSchema>;
