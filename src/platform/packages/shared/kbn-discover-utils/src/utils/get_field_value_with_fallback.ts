/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Build the map once at module load time
const OTEL_EQUIVALENT_MAP: Partial<Record<string, string>> = {
  message: 'body.text',
  'log.level': 'severity_text',
  'service.name': 'resource.attributes.service.name',
  'host.name': 'resource.attributes.host.name',
  'container.name': 'resource.attributes.container.name',
  'orchestrator.cluster.name': 'resource.attributes.cluster.name',
  'kubernetes.namespace': 'attributes.kubernetes.namespace',
  'kubernetes.container.name': 'attributes.kubernetes.container.name',
  'kubernetes.deployment.name': 'attributes.kubernetes.deployment.name',
};

/**
 * Gets a field value from a document, checking both ECS and OpenTelemetry field names.
 * First checks the primary ECS field, then falls back to OTel equivalent fields if defined.
 *
 * @param document - The document object (flattened)
 * @param ecsFieldName - The ECS field name to look up
 * @returns Object with the actual field name found and its value, or undefined field if not found
 *
 * @example
 * // For service.name, checks: service.name → resource.attributes.service.name
 * getFieldValueWithFallback(doc, 'service.name');
 * // Returns: { field: 'service.name', value: 'my-service' } or { field: 'resource.attributes.service.name', value: 'my-service' }
 *
 * // For message, checks: message → body.text
 * getFieldValueWithFallback(doc, 'message');
 * // Returns: { field: 'message', value: 'log msg' } or { field: 'body.text', value: 'log msg' }
 *
 * // For log.level, checks: log.level → severity_text
 * getFieldValueWithFallback(doc, 'log.level');
 * // Returns: { field: 'log.level', value: 'info' } or { field: 'severity_text', value: 'INFO' }
 */
export function getFieldValueWithFallback(
  document: Record<string, any>,
  ecsFieldName: string
): { field: string | undefined; value: any } {
  // First check the ECS field name
  if (document[ecsFieldName] !== undefined) {
    return { field: ecsFieldName, value: document[ecsFieldName] };
  }

  // Then check OTel equivalent fields
  const otelEquivalent = OTEL_EQUIVALENT_MAP[ecsFieldName];
  if (otelEquivalent) {
    if (document[otelEquivalent] !== undefined) {
      return { field: otelEquivalent, value: document[otelEquivalent] };
    }
  }

  return { field: undefined, value: undefined };
}

/**
 * Gets multiple field values with OTel fallbacks, returning the first non-undefined value.
 * Useful for checking a ranked list of fields (e.g., message → error.message → event.original).
 *
 * @param document - The document object (flattened)
 * @param ecsFieldNames - Array of ECS field names to check in order
 * @returns Object with the actual field name and value that was found, or undefined field if none found
 */
export function getFirstAvailableFieldValue(
  document: Record<string, any>,
  ecsFieldNames: readonly string[]
): { field: string | undefined; value?: any } {
  for (const fieldName of ecsFieldNames) {
    const result = getFieldValueWithFallback(document, fieldName);
    if (result.field !== undefined && result.value !== undefined && result.value !== null) {
      return result;
    }
  }
  return { field: undefined };
}
