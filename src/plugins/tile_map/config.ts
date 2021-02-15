/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
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

export type ConfigSchema = TypeOf<typeof configSchema>;
