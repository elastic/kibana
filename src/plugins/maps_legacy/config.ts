/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { configSchema as tilemapSchema } from '../tile_map/config';
import { configSchema as regionmapSchema } from '../region_map/config';

import {
  DEFAULT_EMS_FONT_LIBRARY_URL,
  DEFAULT_EMS_LANDING_PAGE_URL,
  DEFAULT_EMS_TILE_API_URL,
  DEFAULT_EMS_FILE_API_URL,
} from './common/ems_defaults';

export const configSchema = schema.object({
  includeElasticMapsService: schema.boolean({ defaultValue: true }),
  proxyElasticMapsServiceInMaps: schema.boolean({ defaultValue: false }),
  tilemap: tilemapSchema,
  regionmap: regionmapSchema,
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
