/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InferenceTracingExportConfig } from '@kbn/inference-tracing-config';

/**
 * Configuration schema for the OTLP exporter (gRPC or HTTP).
 */
export interface OTLPExportConfig {
  /**
   * The URL for OTLP receiver endpoint.
   */
  url: string;
  /**
   * Optional headers for authentication or metadata.
   */
  headers?: Record<string, string>;
  /**
   * The delay in milliseconds before the exporter sends another
   * batch of spans.
   */
  scheduled_delay: number;
}

/**
 * Allowed configurations for OTLP tracing exporters
 */
export type TracingExporterConfig =
  | InferenceTracingExportConfig
  | { grpc: OTLPExportConfig }
  | { http: OTLPExportConfig };

/**
 * Configuration for OpenTelemetry tracing
 */
export interface TracingConfig {
  /**
   * Whether OpenTelemetry tracing is enabled.
   */
  enabled: boolean;
  /**
   * At which rate spans get sampled if a sampling decision
   * needs to be made. Should be between 0-1.
   */
  sample_rate: number;
  /**
   * OTLP exporters for tracing data
   */
  exporters: TracingExporterConfig | TracingExporterConfig[];
}
