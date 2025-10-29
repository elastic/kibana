/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EcsFlat } from '@elastic/ecs';

/**
 * Builds a map of ECS field names to their OpenTelemetry equivalent field names.
 * Uses the ECS schema's built-in otel mappings to support OTel field lookups.
 */
function buildOtelEquivalentMap(): Map<string, string[]> {
  const otelEquivalentMap = new Map<string, string[]>();

  Object.entries(EcsFlat).forEach(([fieldName, field]) => {
    if (!('otel' in field) || !field.otel || field.otel.length === 0) {
      return;
    }

    const otelEquivalents: string[] = [];

    // Check for equivalent relation
    const equivalentMapping = field.otel.find(
      (otelProperty) => otelProperty.relation === 'equivalent'
    );
    if (
      equivalentMapping &&
      'attribute' in equivalentMapping &&
      typeof equivalentMapping.attribute === 'string'
    ) {
      otelEquivalents.push(equivalentMapping.attribute);
    }

    // Check for otlp relation (body.text case)
    const otlpMapping = field.otel.find((otelProperty) => otelProperty.relation === 'otlp');
    if (otlpMapping && 'otlp_field' in otlpMapping && typeof otlpMapping.otlp_field === 'string') {
      const otlpField = otlpMapping.otlp_field === 'body' ? 'body.text' : otlpMapping.otlp_field;
      otelEquivalents.push(otlpField);
    }

    if (otelEquivalents.length > 0) {
      otelEquivalentMap.set(fieldName, otelEquivalents);
    }
  });

  return otelEquivalentMap;
}

// Build the map once at module load time
const OTEL_EQUIVALENT_MAP = buildOtelEquivalentMap();

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
  const otelEquivalents = OTEL_EQUIVALENT_MAP.get(ecsFieldName);
  if (otelEquivalents) {
    for (const otelField of otelEquivalents) {
      if (document[otelField] !== undefined) {
        return { field: otelField, value: document[otelField] };
      }
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
