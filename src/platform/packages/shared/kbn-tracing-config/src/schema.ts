/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { inferenceTracingExportConfigSchema } from '@kbn/inference-tracing-config';
import type { TracingConfig, TracingExporterConfig, OTLPExportConfig } from './types';

const scheduledDelay = schema.conditional(
  schema.contextRef('dev'),
  true,
  schema.number({ defaultValue: 1000 }),
  schema.number({ defaultValue: 5000 })
);

const otlpExportConfigSchema: Type<OTLPExportConfig> = schema.object({
  url: schema.string(),
  headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  scheduled_delay: scheduledDelay,
});

const tracingExportConfigSchema: Type<TracingExporterConfig> = schema.oneOf([
  inferenceTracingExportConfigSchema,
  schema.object({
    grpc: otlpExportConfigSchema,
  }),
  schema.object({
    http: otlpExportConfigSchema,
  }),
]);

/**
 * The tracing config schema that is exposed by the Telemetry plugin.
 */
export const tracingConfigSchema: Type<TracingConfig> = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  sample_rate: schema.number({ defaultValue: 1, min: 0, max: 1 }),
  exporters: schema.oneOf([tracingExportConfigSchema, schema.arrayOf(tracingExportConfigSchema)], {
    defaultValue: [],
  }),
});
