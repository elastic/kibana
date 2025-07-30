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

export const telemetryTracingSchemaProps = {
  enabled: schema.boolean({ defaultValue: true }),
  tracing: tracingConfigSchema,
  metrics: metricsConfigSchema,
};

export const telemetryTracingSchema: Type<TelemetryConfig> = schema.object(
  telemetryTracingSchemaProps
);
