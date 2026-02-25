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
  /**
   * The maximum batch size of every export. It must be smaller or equal to
   * maxQueueSize. The default value is 512.
   */
  max_export_batch_size: number;
  /**
   * The maximum queue size. After the size is reached spans are dropped.
   * The default value is 2048.
   */
  max_queue_size: number;
}

/**
 * Allowed configurations for OTLP tracing exporters
 */
export type TracingExporterConfig =
  | InferenceTracingExportConfig
  | { grpc: OTLPExportConfig }
  | { http: OTLPExportConfig }
  | { proto: OTLPExportConfig };

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
  /**
   * Configuration for auto-instrumentations.
   */
  auto_instrumentations: AutoInstrumentationsConfig;
}

/**
 * Configuration for auto-instrumentations.
 */
export interface AutoInstrumentationsConfig {
  /**
   * Whether auto-instrumentations should be enabled.
   */
  enabled: boolean;
}
