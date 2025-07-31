/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type Type, schema } from '@kbn/config-schema';
import { inferenceTracingExportConfigSchema } from '@kbn/inference-tracing-config';
import { TracingConfig, type TracingExporterConfig } from './types';

export const tracingExporterConfigSchema: Type<TracingExporterConfig> = schema.oneOf([
  inferenceTracingExportConfigSchema,

  // GRPC OTLP Exporter
  schema.object({
    grpc: schema.object({
      url: schema.string(),
      headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    }),
  }),

  // HTTP OTLP Exporter
  schema.object({
    http: schema.object({
      url: schema.string(),
      headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    }),
  }),
]);

/**
 * The tracing config schema that is exposed by the Telemetry plugin.
 */
export const tracingConfigSchema: Type<TracingConfig> = schema.object({
  enabled: schema.maybe(schema.boolean()),
  sample_rate: schema.number({ defaultValue: 1, min: 0, max: 1 }),
  exporters: schema.maybe(
    schema.oneOf([tracingExporterConfigSchema, schema.arrayOf(tracingExporterConfigSchema)])
  ),
});
