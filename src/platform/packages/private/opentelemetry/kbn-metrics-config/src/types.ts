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
 * Common configuration for OTLP metrics exporters
 */
export interface MetricsExporterCommonConfig {
  /** Frequency in which the exporter should collect the metrics. If not provided, the global export interval will be used. */
  exportInterval?: Duration;
  /** Timeout for the metrics export. If not provided, the global export timeout will be used. */
  exportTimeout?: Duration;
  /** The preferred temporality of the metrics. Defaults to `delta`, as it plays better with the ES backend. */
  temporalityPreference: 'delta' | 'cumulative';
}

/**
 * Allowed configurations for OTLP metrics exporters
 */
export type MetricsExporterConfig =
  | {
      /** GRPC OTLP Exporter */
      grpc: MetricsExporterCommonConfig & {
        /** The URL of the OTLP gRPC endpoint */
        url: string;
        /** HTTP headers to send to the OTLP gRPC endpoint. Typically, the `Authorization` header is one of them */
        headers?: Record<string, string>;
      };
    }
  | {
      /** HTTP OTLP Exporter */
      http: MetricsExporterCommonConfig & {
        /** The URL of the OTLP HTTP endpoint */
        url: string;
        /** HTTP headers to send to the OTLP HTTP endpoint. Typically, the `Authorization` header is one of them */
        headers?: Record<string, string>;
      };
    }
  | {
      /** Protobuf OTLP Exporter */
      proto: MetricsExporterCommonConfig & {
        /** The URL of the OTLP HTTP endpoint */
        url: string;
        /** HTTP headers to send to the OTLP HTTP endpoint. Typically, the `Authorization` header is one of them */
        headers?: Record<string, string>;
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
   * The timeout for the metrics export
   */
  timeout?: Duration;
  /**
   * OTLP exporters for metric data
   */
  exporters: MetricsExporterConfig | MetricsExporterConfig[];
}
