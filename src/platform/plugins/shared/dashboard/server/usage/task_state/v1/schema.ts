/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const versionSchema = schema.object({
  runs: schema.number(),
  telemetry: schema.object({
    panels: schema.object({
      total: schema.number(),
      by_reference: schema.number(),
      by_value: schema.number(),
      by_type: schema.recordOf(
        schema.string(),
        schema.object({
          total: schema.number(),
          by_reference: schema.number(),
          by_value: schema.number(),
          details: schema.recordOf(schema.string(), schema.number()),
        })
      ),
    }),
    controls: schema.object({
      total: schema.number(),
      chaining_system: schema.recordOf(schema.string(), schema.number()),
      label_position: schema.recordOf(schema.string(), schema.number()),
      ignore_settings: schema.recordOf(schema.string(), schema.number()),
      by_type: schema.recordOf(
        schema.string(),
        schema.object({
          total: schema.number(),
        })
      ),
    }),
    sections: schema.object({ total: schema.number() }),
  }),
});
