/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema, type Type } from '@kbn/config-schema';
import { tracingConfigSchema } from '@kbn/tracing-config';
import { metricsConfigSchema } from '@kbn/metrics-config';
import type { TelemetryConfig } from './types';

/**
 * Properties to use in the {@link telemetryConfigSchema}.
 * They are exported separately because they are used by the telemetry plugin to extend its config schema
 * since everything is in the same `telemetry.*` config path.
 *
 * @internal
 */
export const telemetryConfigSchemaProps = {
  /**
   * Global toggle for telemetry. It disables all form of telemetry: product analytics, OTel tracing and OTel metrics.
   */
  enabled: schema.boolean({ defaultValue: true }),
  /** The {@link tracingConfigSchema | tracing config schema} */
  tracing: tracingConfigSchema,
  /** The {@link metricsConfigSchema | metrics config schema} */
  metrics: metricsConfigSchema,
};

/**
 * Schema for the OpenTelemetry configuration
 */
export const telemetryConfigSchema: Type<TelemetryConfig> = schema.object(
  telemetryConfigSchemaProps
);
