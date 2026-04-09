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
 *
 * @example
 * ```yaml
 * logging:
 *   appenders:
 *     otel:
 *       type: otel
 *       url: https://collector:4318/v1/logs
 *       headers:
 *         Authorization: "ApiKey <base64>"
 *       attributes:
 *         # Use bracket notation to prevent Kibana from splitting dotted keys:
 *         "[service.name]": my-kibana
 *         "[deployment.environment]": production
 * ```
 * @public
 */
export interface OtelAppenderConfig {
  /** Discriminator for this appender type. */
  type: 'otel';
  /** OTLP HTTP endpoint URL, e.g. https://collector:4318/v1/logs */
  url: string;
  /** Optional HTTP headers, e.g. for authentication */
  headers: Record<string, string>;
  /**
   * Additional resource attributes merged on top of the auto-detected host,
   * process, OS and service attributes. Can be used to override defaults such
   * as `service.name`. Because Kibana expands dotted YAML keys into nested
   * objects, wrap dotted attribute names in `[brackets]`:
   * `"[service.name]": my-kibana`
   */
  attributes?: Record<string, string>;
}
