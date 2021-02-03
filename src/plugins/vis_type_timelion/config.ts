/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object(
  {
    enabled: schema.boolean({ defaultValue: true }),
    ui: schema.object({ enabled: schema.boolean({ defaultValue: false }) }),
    graphiteUrls: schema.maybe(schema.arrayOf(schema.string())),
  },
  // This option should be removed as soon as we entirely migrate config from legacy Timelion plugin.
  { unknowns: 'allow' }
);

export type ConfigSchema = TypeOf<typeof configSchema>;
