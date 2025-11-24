/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';

/**
 * ECS to OTEL Conversion Utilities
 *
 * Converts Elastic Common Schema (ECS) log data to OpenTelemetry (OTEL) format.
 * Follows OTEL semantic conventions for field naming and structure.
 *
 * OTEL Structure:
 * - Resource Attributes: Infrastructure/service metadata (service, cloud, k8s, host)
 * - Log Attributes: Request/response specific data (http, network, error, correlation)
 * - Severity: Mapped from log levels to OTEL severity text and numbers
 */

/**
 * Field mappings for resource attributes (infrastructure/service metadata).
 * These attributes describe the resource that produced the log.
 */
const RESOURCE_ATTRIBUTE_MAPPINGS: Record<string, string> = {
  // Service fields (1:1 mapping)
  'service.name': 'service.name',
  'service.version': 'service.version',
  'service.environment': 'service.environment',
  'deployment.name': 'deployment.name',

  // Cloud fields (1:1 mapping)
  'cloud.provider': 'cloud.provider',
  'cloud.region': 'cloud.region',
  'cloud.availability_zone': 'cloud.availability_zone',
  'cloud.instance.id': 'cloud.instance.id',
  'cloud.instance.name': 'cloud.instance.name',
  'cloud.project.id': 'cloud.project.id',

  // Kubernetes fields (ECS -> k8s.* semantic conventions)
  'kubernetes.namespace': 'k8s.namespace.name',
  'kubernetes.pod.name': 'k8s.pod.name',
  'kubernetes.pod.uid': 'k8s.pod.uid',
  'kubernetes.container.name': 'k8s.container.name',
  'kubernetes.deployment.name': 'k8s.deployment.name',
  'kubernetes.node.name': 'k8s.node.name',

  // Container fields (1:1 mapping)
  'container.id': 'container.id',
  'container.name': 'container.name',
  'container.image.name': 'container.image.name',
  'container.runtime': 'container.runtime',

  // Host fields
  hostname: 'host.name',
  'host.ip': 'host.ip',
};

/**
 * Field mappings for log attributes (request/response specific data).
 * These attributes describe the specific log event/request.
 */
const LOG_ATTRIBUTE_MAPPINGS: Record<string, string> = {
  // HTTP fields (ECS -> http.* semantic conventions)
  'http.request.method': 'http.method',
  'url.path': 'http.target',
  'http.response.status_code': 'http.status_code',
  'http.version': 'http.flavor',
  'http.response.bytes': 'http.response_content_length',
  'user_agent.name': 'http.user_agent',
  'http.request.referrer': 'http.referer',

  // Network fields (ECS -> net.* semantic conventions)
  'client.ip': 'net.peer.ip',
  'network.protocol': 'net.protocol.name',
  'network.transport': 'net.transport',
  'network.type': 'net.type',

  // TLS fields (1:1 mapping)
  'tls.version': 'tls.version',
  'tls.cipher': 'tls.cipher',

  // Correlation IDs
  'trace.id': 'trace_id',
  'span.id': 'span_id',
  'transaction.id': 'transaction.id',
  'session.id': 'session.id',

  // Error fields (1:1 mapping)
  'error.type': 'error.type',
  'error.message': 'error.message',
  'error.code': 'error.code',

  // Event fields (1:1 mapping)
  'event.category': 'event.category',
  'event.type': 'event.type',
  'event.outcome': 'event.outcome',
  'event.action': 'event.action',
  'event.sequence': 'event.sequence',

  // Rule fields (1:1 mapping)
  'rule.name': 'rule.name',

  // Source fields
  'source.ip': 'source.ip',
};

/**
 * Geographic field mappings (ECS -> OTEL semantic conventions).
 * OTEL uses different naming for geographic attributes.
 */
const GEO_ATTRIBUTE_MAPPINGS: Record<string, string> = {
  'host.geo.city_name': 'geo.locality.name',
  'host.geo.country_name': 'geo.country.name',
  'host.geo.country_iso_code': 'geo.country.iso_code',
  'host.geo.continent_name': 'geo.continent.name',
  'host.geo.region_name': 'geo.region.name',
  'host.geo.timezone': 'geo.timezone',
};

/**
 * OTEL severity levels mapped from common log levels.
 * OTEL uses both text and numeric severity values.
 */
const SEVERITY_MAP: Record<string, { text: string; number: number }> = {
  trace: { text: 'TRACE', number: 1 },
  debug: { text: 'DEBUG', number: 5 },
  info: { text: 'INFO', number: 9 },
  warn: { text: 'WARN', number: 13 },
  warning: { text: 'WARN', number: 13 },
  error: { text: 'ERROR', number: 17 },
  fatal: { text: 'FATAL', number: 21 },
};

/**
 * Result of ECS to OTEL conversion containing separated attributes.
 */
export interface OtelConversionResult {
  resourceAttributes: Record<string, unknown>;
  logAttributes: Record<string, unknown>;
  severity: { text: string; number: number };
  message: string;
}

/**
 * Apply a mapping table to convert ECS fields to OTEL attributes.
 *
 * @param logData - ECS log document
 * @param mappings - Field mapping table (ECS field -> OTEL attribute)
 * @returns Object with OTEL attribute names and values
 */
function applyFieldMappings(
  logData: Partial<LogDocument>,
  mappings: Record<string, string>
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};

  Object.entries(mappings).forEach(([ecsField, otelField]) => {
    const value = logData[ecsField as keyof LogDocument];
    if (value !== undefined) {
      attributes[otelField] = value;
    }
  });

  return attributes;
}

/**
 * Convert ECS geo location fields to OTEL format.
 * Handles both the location array (lon/lat) and named geo fields.
 *
 * @param logData - ECS log document
 * @returns OTEL geo attributes
 */
function convertGeoAttributes(logData: Partial<LogDocument>): Record<string, unknown> {
  const geoAttributes: Record<string, unknown> = {};

  // Handle geo.location array (decompose into lon/lat)
  if (logData['host.geo.location']) {
    const [lon, lat] = logData['host.geo.location'];
    geoAttributes['geo.location.lon'] = lon;
    geoAttributes['geo.location.lat'] = lat;
  }

  // Apply other geo field mappings
  Object.entries(GEO_ATTRIBUTE_MAPPINGS).forEach(([ecsField, otelField]) => {
    const value = logData[ecsField as keyof LogDocument];
    if (value !== undefined) {
      geoAttributes[otelField] = value;
    }
  });

  return geoAttributes;
}

/**
 * Convert ECS tags and labels to OTEL format.
 * Tags are passed through as-is, labels are prefixed with "label.*".
 *
 * @param logData - ECS log document
 * @returns OTEL tags and label attributes
 */
function convertTagsAndLabels(logData: Partial<LogDocument>): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};

  // Tags pass through as-is
  if (logData.tags) {
    attributes.tags = logData.tags;
  }

  // Labels are prefixed with "label.*"
  if (logData.labels) {
    Object.entries(logData.labels).forEach(([key, value]) => {
      attributes[`label.${key}`] = value;
    });
  }

  return attributes;
}

/**
 * Map ECS log level to OTEL severity.
 *
 * @param logLevel - ECS log level (trace, debug, info, warn, error, fatal)
 * @returns OTEL severity with text and number
 */
function convertSeverity(logLevel?: string): { text: string; number: number } {
  const level = (logLevel || 'info').toLowerCase();
  return SEVERITY_MAP[level] || SEVERITY_MAP.info;
}

/**
 * Generate a human-readable log message from ECS data.
 * Falls back to HTTP request format if no message is provided.
 *
 * @param logData - ECS log document
 * @returns Log message string
 */
function generateLogMessage(logData: Partial<LogDocument>): string {
  return (
    logData.message ||
    `${logData['http.request.method']} ${logData['url.path']} ${logData['http.response.status_code']}`
  );
}

/**
 * Convert ECS log document to OTEL format.
 *
 * This is the main conversion function that transforms ECS log data into OTEL format,
 * separating resource attributes (infrastructure metadata) from log attributes
 * (request/response data) according to OTEL semantic conventions.
 *
 * @param logData - ECS log document (Partial<LogDocument>)
 * @returns OtelConversionResult with separated resource/log attributes, severity, and message
 *
 * @example
 * ```typescript
 * const ecsData = {
 *   'service.name': 'api-gateway',
 *   'http.request.method': 'GET',
 *   'http.response.status_code': 200,
 *   'client.ip': '203.0.113.42'
 * };
 *
 * const otelData = convertEcsToOtel(ecsData);
 * // Result:
 * // {
 * //   resourceAttributes: { 'service.name': 'api-gateway' },
 * //   logAttributes: { 'http.method': 'GET', 'http.status_code': 200, 'net.peer.ip': '203.0.113.42' },
 * //   severity: { text: 'INFO', number: 9 },
 * //   message: 'GET /api/users 200'
 * // }
 * ```
 */
export function convertEcsToOtel(logData: Partial<LogDocument>): OtelConversionResult {
  // Build resource attributes (infrastructure/service metadata)
  const resourceAttributes = applyFieldMappings(logData, RESOURCE_ATTRIBUTE_MAPPINGS);

  // Build log attributes (request/response data)
  const logAttributes = {
    ...applyFieldMappings(logData, LOG_ATTRIBUTE_MAPPINGS),
    ...convertGeoAttributes(logData),
    ...convertTagsAndLabels(logData),
  };

  // Convert severity
  const severity = convertSeverity(logData['log.level']);

  // Generate message
  const message = generateLogMessage(logData);

  return {
    resourceAttributes,
    logAttributes,
    severity,
    message,
  };
}
