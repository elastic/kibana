/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

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

export const configSchema = schema.object({
  includeElasticMapsService: schema.boolean({ defaultValue: true }),
  layers: schema.arrayOf(layerConfigSchema, { defaultValue: [] }),
});

export type LayerConfig = TypeOf<typeof layerConfigSchema>;

export type ConfigSchema = TypeOf<typeof configSchema>;
