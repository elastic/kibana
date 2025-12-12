/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { TracingConfig } from '@kbn/tracing-config';
import type { MetricsConfig } from '@kbn/metrics-config';

/**
 * Configuration for OpenTelemetry
 */
export interface TelemetryConfig {
  /**
   * Whether telemetry collection is enabled.
   */
  enabled: boolean;
  /**
   * Tracing config. See {@link TracingConfig}.
   */
  tracing: TracingConfig;
  /**
   * Metrics config. See {@link MetricsConfig}.
   */
  metrics: MetricsConfig;
}
