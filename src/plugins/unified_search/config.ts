/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  autocomplete: schema.object({
    querySuggestions: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
    valueSuggestions: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      tiers: schema.arrayOf(
        schema.oneOf([
          schema.literal('data_content'),
          schema.literal('data_hot'),
          schema.literal('data_warm'),
          schema.literal('data_cold'),
          schema.literal('data_frozen'),
        ]),
        {
          defaultValue: ['data_hot', 'data_warm', 'data_content', 'data_cold'],
        }
      ),
      terminateAfter: schema.duration({ defaultValue: 100000 }),
      timeout: schema.duration({ defaultValue: 1000 }),
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
