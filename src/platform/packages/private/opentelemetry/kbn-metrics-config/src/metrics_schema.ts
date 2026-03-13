/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type Type } from '@kbn/config-schema';
import type { MetricsExporterConfig, MetricsConfig } from './types';

const metricsCommonExporterConfigSchema = schema.object({
  exportInterval: schema.maybe(schema.duration()),
  exportTimeout: schema.maybe(schema.duration()),
  temporalityPreference: schema.oneOf([schema.literal('cumulative'), schema.literal('delta')], {
    defaultValue: 'delta',
  }),
});

export const metricsExporterConfigSchema: Type<MetricsExporterConfig> = schema.oneOf([
  // gRPC OTLP Exporter
  schema.object({
    grpc: metricsCommonExporterConfigSchema.extends({
      url: schema.string(),
      headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    }),
  }),

  // HTTP OTLP Exporter
  schema.object({
    http: metricsCommonExporterConfigSchema.extends({
      url: schema.string(),
      headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    }),
  }),

  // Protobuf OTLP Exporter
  schema.object({
    proto: metricsCommonExporterConfigSchema.extends({
      url: schema.string(),
      headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    }),
  }),
]);

/**
 * The metrics config schema that is exposed by the Telemetry plugin.
 */
export const metricsConfigSchema: Type<MetricsConfig> = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  interval: schema.duration({ defaultValue: '10s' }),
  timeout: schema.maybe(schema.duration()),
  exporters: schema.oneOf(
    [metricsExporterConfigSchema, schema.arrayOf(metricsExporterConfigSchema)],
    { defaultValue: [] }
  ),
});
