/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export type ConfigType = TypeOf<typeof ConfigSchema>;

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  connectionCheck: schema.object({
    interval: schema.duration({
      defaultValue: '5s',
      validate(value) {
        if (value.asSeconds() < 1) {
          return 'the value must be greater or equal to 1 second.';
        }
      },
    }),
  }),
});
