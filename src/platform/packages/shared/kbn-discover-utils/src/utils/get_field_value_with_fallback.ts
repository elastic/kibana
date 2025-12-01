/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const OTEL_EQUIVALENT_MAP: Partial<Record<string, string>> = {
  message: 'body.text',
  'log.level': 'severity_text',
};

/**
 * Gets a field value from a document, checking both ECS and OpenTelemetry field names.
 * First checks the primary ECS field, then falls back to OTel equivalent fields if defined.
 *
 * @param document - The document object (flattened)
 * @param ecsFieldName - The ECS field name to look up
 * @returns Object with the actual field name found and its value, or undefined field if not found
 */
export function getFieldValueWithFallback(
  document: Record<string, unknown>,
  ecsFieldName: string
): { field: string | undefined; value: unknown } {
  if (document[ecsFieldName] !== undefined) {
    return { field: ecsFieldName, value: document[ecsFieldName] };
  }

  // Then check OTel equivalent fields
  const otelEquivalent = OTEL_EQUIVALENT_MAP[ecsFieldName];
  if (otelEquivalent && document[otelEquivalent] !== undefined) {
    return { field: otelEquivalent, value: document[otelEquivalent] };
  }
  // check with attributes. prefix
  const otelAttributesEquivalent = `attributes.${ecsFieldName}`;
  if (document[otelAttributesEquivalent] !== undefined) {
    return { field: otelAttributesEquivalent, value: document[otelAttributesEquivalent] };
  }

  // check with resource.attributes. prefix
  const otelResourceAttributesEquivalent = `resource.attributes.${ecsFieldName}`;
  if (document[otelResourceAttributesEquivalent] !== undefined) {
    return {
      field: otelResourceAttributesEquivalent,
      value: document[otelResourceAttributesEquivalent],
    };
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
  document: Record<string, unknown>,
  ecsFieldNames: readonly string[]
): { field: string | undefined; value?: unknown } {
  for (const fieldName of ecsFieldNames) {
    const result = getFieldValueWithFallback(document, fieldName);
    if (result.field !== undefined && result.value !== undefined && result.value !== null) {
      return result;
    }
  }
  return { field: undefined };
}
