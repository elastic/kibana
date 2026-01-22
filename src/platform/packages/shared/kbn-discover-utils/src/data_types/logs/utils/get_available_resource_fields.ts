/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResourceFields } from '../../..';
import { getFieldValueWithFallback } from '../../../utils/get_field_value_with_fallback';

export interface ResourceFieldResult {
  /** The field name that was found */
  fieldName: string;
  /** Whether this field comes from _source (not filterable) vs mapped fields (filterable) */
  isFromSource: boolean;
}

/**
 * Flattens nested objects and extracts fields with specific prefixes
 * Used as a fallback to find resource fields in _source when they're not mapped
 */
function flattenSourceObject(
  obj: Record<string, unknown>,
  prefix: string = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(result, flattenSourceObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Checks _source for fields with 'attributes.*' or 'resource.attributes.*' prefixes
 * as a fallback when mapped fields are not available.
 * Returns the field name and metadata about whether it's filterable.
 */
function checkSourceForResourceField(
  source: Record<string, unknown> | undefined,
  targetFields: Array<keyof ResourceFields>
): ResourceFieldResult | undefined {
  if (!source) {
    return undefined;
  }

  // Flatten the _source object
  const flattened = flattenSourceObject(source);

  // Check each target field with different prefixes
  for (const fieldName of targetFields) {
    // Check attributes.* prefix
    const attributesField = `attributes.${fieldName}`;
    if (
      flattened[attributesField] !== undefined &&
      flattened[attributesField] !== null &&
      flattened[attributesField] !== ''
    ) {
      return { fieldName: attributesField, isFromSource: true };
    }

    // Check resource.attributes.* prefix
    const resourceAttributesField = `resource.attributes.${fieldName}`;
    if (
      flattened[resourceAttributesField] !== undefined &&
      flattened[resourceAttributesField] !== null &&
      flattened[resourceAttributesField] !== ''
    ) {
      return { fieldName: resourceAttributesField, isFromSource: true };
    }
  }

  return undefined;
}

// Use first available field from each group
const AVAILABLE_RESOURCE_FIELDS: Array<Array<keyof ResourceFields>> = [
  ['service.name'],
  ['kubernetes.container.name', 'k8s.container.name', 'container.name'],
  ['kubernetes.node.name', 'k8s.node.name', 'host.name'],
  ['orchestrator.cluster.name', 'k8s.cluster.name'],
  ['kubernetes.namespace', 'k8s.namespace.name'],
  ['kubernetes.pod.name', 'k8s.pod.name'],
  // Only one of these will be present in a single doc
  [
    'kubernetes.deployment.name',
    'k8s.deployment.name',
    'kubernetes.replicaset.name',
    'k8s.replicaset.name',
    'kubernetes.statefulset.name',
    'k8s.statefulset.name',
    'kubernetes.daemonset.name',
    'k8s.daemonset.name',
    'kubernetes.job.name',
    'k8s.job.name',
    'kubernetes.cronjob.name',
    'k8s.cronjob.name',
  ],
];

export const getAvailableResourceFields = (resourceDoc: Record<string, unknown>): string[] =>
  AVAILABLE_RESOURCE_FIELDS.reduce<string[]>((acc, fields) => {
    for (const fieldName of fields) {
      const result = getFieldValueWithFallback(resourceDoc, fieldName);
      if (
        result.field &&
        result.value !== undefined &&
        result.value !== null &&
        result.value !== ''
      ) {
        acc.push(result.field);
        break;
      }
    }
    return acc;
  }, []);

/**
 * POC: Enhanced version that checks _source as a fallback for unmapped resource fields.
 * Returns both the field names and metadata about whether they're filterable.
 * Fields from _source with attributes.* or resource.attributes.* prefixes are marked as not filterable.
 */
export const getAvailableResourceFieldsWithSourceFallback = (
  resourceDoc: Record<string, unknown>,
  source?: Record<string, unknown>
): ResourceFieldResult[] =>
  AVAILABLE_RESOURCE_FIELDS.reduce<ResourceFieldResult[]>((acc, fields) => {
    // First, check mapped fields (filterable)
    for (const fieldName of fields) {
      const result = getFieldValueWithFallback(resourceDoc, fieldName);
      if (
        result.field &&
        result.value !== undefined &&
        result.value !== null &&
        result.value !== ''
      ) {
        acc.push({ fieldName: result.field, isFromSource: false });
        return acc; // Found in mapped fields, skip _source check
      }
    }

    // Fallback: check _source for unmapped fields (not filterable)
    const sourceResult = checkSourceForResourceField(source, fields);
    if (sourceResult) {
      acc.push(sourceResult);
    }

    return acc;
  }, []);
