/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Duration } from 'moment';

/**
 * Allowed configurations for OTLP metrics exporters
 */
export type MetricsExporterConfig =
  | {
      /** GRPC OTLP Exporter */
      grpc: {
        /** The URL of the OTLP gRPC endpoint */
        url: string;
        /** HTTP headers to send to the OTLP gRPC endpoint. Typically, the `Authorization` header is one of them */
        headers?: Record<string, string>;
        /** Frequency in which the exporter should collect the metrics */
        exportIntervalMillis?: number | Duration;
      };
    }
  | {
      /** HTTP OTLP Exporter */
      http: {
        /** The URL of the OTLP HTTP endpoint */
        url: string;
        /** HTTP headers to send to the OTLP HTTP endpoint. Typically, the `Authorization` header is one of them */
        headers?: Record<string, string>;
        /** Frequency in which the exporter should collect the metrics */
        exportIntervalMillis?: number | Duration;
      };
    };

/**
 * Configuration for OpenTelemetry metrics
 */
export interface MetricsConfig {
  /**
   * Whether OpenTelemetry metrics are enabled
   */
  enabled: boolean;
  /**
   * The interval at which to export metrics
   */
  interval: Duration;
  /**
   * OTLP exporters for metric data
   */
  exporters: MetricsExporterConfig | MetricsExporterConfig[];
}
