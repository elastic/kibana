/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export type ConfigType = TypeOf<typeof config>;

export const config = schema.object(
  {
    enabled: schema.boolean({ defaultValue: true }),
    proxyFilter: schema.arrayOf(schema.string(), { defaultValue: ['.*'] }),
    ssl: schema.object({ verify: schema.boolean({ defaultValue: false }) }, {}),

    // This does not actually work, track this issue: https://github.com/elastic/kibana/issues/55576
    proxyConfig: schema.arrayOf(
      schema.object({
        match: schema.object({
          protocol: schema.string({ defaultValue: '*' }),
          host: schema.string({ defaultValue: '*' }),
          port: schema.string({ defaultValue: '*' }),
          path: schema.string({ defaultValue: '*' }),
        }),

        timeout: schema.number(),
        ssl: schema.object(
          {
            verify: schema.boolean(),
            ca: schema.arrayOf(schema.string()),
            cert: schema.string(),
            key: schema.string(),
          },
          { defaultValue: undefined }
        ),
      }),
      { defaultValue: [] }
    ),
  },
  { defaultValue: undefined }
);
