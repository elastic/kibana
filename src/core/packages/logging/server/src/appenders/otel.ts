/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Configuration of an OpenTelemetry (OTLP) log appender.
 * Ships log records to an OTLP-compatible endpoint over HTTP.
 * @public
 */
export interface OtelAppenderConfig {
  type: 'otel';
  /** OTLP HTTP endpoint URL, e.g. https://collector:4318/v1/logs */
  url: string;
  /** Optional HTTP headers, e.g. for authentication */
  headers: Record<string, string>;
  /** Resource attributes that identify this service in the OTel data model */
  attributes: Record<string, string>;
}
