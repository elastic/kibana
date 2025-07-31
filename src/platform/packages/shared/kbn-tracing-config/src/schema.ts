/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Type, schema } from '@kbn/config-schema';
import { inferenceTracingExportConfigSchema } from '@kbn/inference-tracing-config';
import { TracingConfig } from './types';

/**
 * The tracing config schema that is exposed by the Telemetry plugin.
 */
export const tracingConfigSchema: Type<TracingConfig> = schema.object({
  enabled: schema.maybe(schema.boolean()),
  sample_rate: schema.number({ defaultValue: 1, min: 0, max: 1 }),
  exporters: schema.maybe(
    schema.oneOf([
      inferenceTracingExportConfigSchema,
      schema.arrayOf(inferenceTracingExportConfigSchema),
    ])
  ),
});
