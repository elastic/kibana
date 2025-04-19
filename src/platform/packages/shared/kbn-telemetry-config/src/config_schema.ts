/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';

export const telemetryConfigSchema = schema.object({
  enabled: schema.maybe(schema.boolean({ defaultValue: true })),
  tracing: schema.maybe(
    schema.object({
      enabled: schema.maybe(schema.boolean()),
      sample_rate: schema.number({ defaultValue: 1, min: 0, max: 1 }),
    })
  ),
});
