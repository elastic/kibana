/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  autocomplete: schema.object({
    querySuggestions: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    valueSuggestions: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
  }),
  search: schema.object({
    aggs: schema.object({
      shardDelay: schema.object({
        // Whether or not to register the shard_delay (which is only available in snapshot versions
        // of Elasticsearch) agg type/expression function to make it available in the UI for either
        // functional or manual testing
        enabled: schema.boolean({ defaultValue: false }),
      }),
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
