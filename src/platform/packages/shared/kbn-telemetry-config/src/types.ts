/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Configuration for OpenTelemetry
 */
export interface TelemetryConfig {
  /**
   * Tracing config. See {@link TracingConfig}.
   */
  tracing?: TracingConfig;
  /**
   * Whether telemetry collection is enabled.
   */
  enabled?: boolean;
}

/**
 * Configuration for OpenTelemetry tracing
 */
export interface TracingConfig {
  /**
   * Whether OpenTelemetry tracing is enabled.
   */
  enabled?: boolean;
  /**
   * At which rate spans get sampled if a sampling decision
   * needs to be made. Should be between 0-1.
   */
  sample_rate: number;
}
