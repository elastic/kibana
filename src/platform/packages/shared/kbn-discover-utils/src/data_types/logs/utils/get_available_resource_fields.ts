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

export const getAvailableResourceFields = (resourceDoc: ResourceFields) =>
  AVAILABLE_RESOURCE_FIELDS.reduce((acc, fields) => {
    const field = fields.find((fieldName) => resourceDoc[fieldName]);
    if (field) {
      acc.push(field);
    }
    return acc;
  }, []);

/**
 * Enhanced version that uses OTel field fallbacks and returns the actual field names found.
 * This ensures that UI components display the correct field names (e.g., 'resource.attributes.service.name'
 * instead of 'service.name' when the document uses OTel format).
 *
 * @param document - The flattened document object
 * @returns Array of objects with actual field names and their values
 */
export const getAvailableResourceFieldsWithActualNames = (
  document: Record<string, any>
): Array<{ field: string; value: any }> => {
  // Priority order for resource fields to check (ECS names)
  const RESOURCE_FIELD_PRIORITY = [
    'service.name',
    'container.name', // Also covers kubernetes.container.name, k8s.container.name
    'host.name', // Also covers kubernetes.node.name, k8s.node.name
    'orchestrator.cluster.name', // Also covers k8s.cluster.name
    'kubernetes.namespace', // Also covers k8s.namespace.name
    'kubernetes.pod.name', // Also covers k8s.pod.name
    'kubernetes.deployment.name', // Also covers other k8s workload types
  ];

  const result: Array<{ field: string; value: any }> = [];

  for (const ecsFieldName of RESOURCE_FIELD_PRIORITY) {
    const { field: actualField, value } = getFieldValueWithFallback(document, ecsFieldName);

    if (actualField && value !== undefined && value !== null) {
      result.push({ field: actualField, value });
    }
  }

  return result;
};
