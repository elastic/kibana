/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Type, schema } from '@kbn/config-schema';
import { MetricsConfig, MetricExporterConfig, OtlpMetricExporterGrpcConfig } from './types';

export const otlpMetricExporterGrpcConfig: Type<OtlpMetricExporterGrpcConfig> = schema.object({
  grpc: schema.object({
    url: schema.uri({
      defaultValue:
        process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    }),
    headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  }),
});

const metricExporterConfigSchema: Type<MetricExporterConfig> = schema.oneOf([
  otlpMetricExporterGrpcConfig,
]);

/**
 * The metrics config schema that is exposed by the Telemetry plugin.
 */
export const metricsConfigSchema: Type<MetricsConfig> = schema.object({
  enabled: schema.maybe(schema.boolean()),
  exporters: schema.oneOf([metricExporterConfigSchema, schema.arrayOf(metricExporterConfigSchema)]),
});
