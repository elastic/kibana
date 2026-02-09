/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EntityDefinition, CuratedMetricQuery, MetricDataSource } from './types';
import { ENTITY_DEFINITIONS } from './definitions';
import { CURATED_METRICS } from './metrics';

/**
 * Get all identifying attributes from entity definitions
 * Used to detect which entities are available in the data
 */
export const getAllEntityAttributes = (): string[] => {
  const attributes = new Set<string>();
  for (const entity of ENTITY_DEFINITIONS) {
    attributes.add(entity.identifyingAttribute);
    if (entity.alternativeAttributes) {
      for (const alt of entity.alternativeAttributes) {
        attributes.add(alt);
      }
    }
  }
  return Array.from(attributes);
};

/**
 * Find matching entity definitions based on available field names
 * Returns entities whose identifying attribute exists in the available fields
 */
export const findAvailableEntities = (availableFields: string[]): EntityDefinition[] => {
  const fieldSet = new Set(availableFields);
  const matchedEntities: EntityDefinition[] = [];

  for (const entity of ENTITY_DEFINITIONS) {
    // Check primary attribute
    if (fieldSet.has(entity.identifyingAttribute)) {
      matchedEntities.push(entity);
      continue;
    }
    // Check alternative attributes
    if (entity.alternativeAttributes) {
      for (const alt of entity.alternativeAttributes) {
        if (fieldSet.has(alt)) {
          // Return entity with the matched alternative as primary
          matchedEntities.push({
            ...entity,
            identifyingAttribute: alt,
          });
          break;
        }
      }
    }
  }

  return matchedEntities;
};

/**
 * Find entity definition by its identifying attribute
 */
export const findEntityByAttribute = (attribute: string): EntityDefinition | undefined => {
  for (const entity of ENTITY_DEFINITIONS) {
    if (entity.identifyingAttribute === attribute) {
      return entity;
    }
    if (entity.alternativeAttributes?.includes(attribute)) {
      return { ...entity, identifyingAttribute: attribute };
    }
  }
  return undefined;
};

/**
 * Find metrics that semantically match an entity based on OTel naming conventions
 * Uses the entity's metricPrefixes to filter available metric fields
 */
export const findMetricsForEntity = (
  entity: EntityDefinition,
  availableFields: string[]
): string[] => {
  const metricPrefixes = entity.metricPrefixes ?? [];
  if (metricPrefixes.length === 0) {
    return [];
  }

  return availableFields.filter((field) =>
    metricPrefixes.some((prefix) => field.startsWith(prefix))
  );
};

/**
 * Get all metric prefixes from all entity definitions
 */
export const getAllMetricPrefixes = (): string[] => {
  const prefixes = new Set<string>();
  for (const entity of ENTITY_DEFINITIONS) {
    if (entity.metricPrefixes) {
      for (const prefix of entity.metricPrefixes) {
        prefixes.add(prefix);
      }
    }
  }
  return Array.from(prefixes).sort();
};

// ============================================================================
// Curated Metrics Utilities
// ============================================================================

/**
 * Indicator fields that suggest OTel data source
 */
const OTEL_INDICATOR_FIELDS = [
  'attributes.state',
  'resource.attributes',
  'system.cpu.utilization', // OTel uses 'utilization' (0-1 ratio)
  'system.memory.utilization',
  'k8s.pod.cpu.usage',
  'k8s.node.cpu.usage',
  'container.cpu.usage',
];

/**
 * Indicator fields that suggest ECS/Elastic Agent data source
 */
const ECS_INDICATOR_FIELDS = [
  'system.cpu.total.norm.pct', // ECS uses 'pct' suffix
  'system.memory.actual.used.pct',
  'event.module',
  'metricset.name',
  'docker.cpu.total.pct',
  'kubernetes.pod.cpu.usage.node.pct',
  'aws.ec2.cpu.total.pct',
];

/**
 * Detect the data source based on available fields
 * Returns the most likely data source or undefined if ambiguous
 *
 * @param availableFields - Array of field names available in the data
 * @returns The detected data source ('otel' | 'ecs') or undefined if ambiguous
 */
export const detectDataSource = (availableFields: string[]): MetricDataSource | undefined => {
  const fieldSet = new Set(availableFields);

  const hasOtel = OTEL_INDICATOR_FIELDS.some((f) => fieldSet.has(f));
  const hasEcs = ECS_INDICATOR_FIELDS.some((f) => fieldSet.has(f));

  if (hasOtel && !hasEcs) return 'otel';
  if (hasEcs && !hasOtel) return 'ecs';

  // Ambiguous or unknown - return undefined to let caller decide
  return undefined;
};

/**
 * Find curated metrics for an entity that are available based on fields
 *
 * This function:
 * 1. Gets all curated metrics for the entity
 * 2. Filters to only those whose required fields exist
 * 3. Prefers metrics matching the detected/preferred data source
 * 4. Falls back to other data source metrics if no matching source exists
 *
 * @param entityId - The entity ID (e.g., 'host', 'k8s.pod')
 * @param availableFields - Array of field names available in the data
 * @param preferredDataSource - Optional preferred data source to prioritize
 * @returns Array of available curated metrics
 */
export const findAvailableCuratedMetrics = (
  entityId: string,
  availableFields: string[],
  preferredDataSource?: MetricDataSource
): CuratedMetricQuery[] => {
  const metrics = CURATED_METRICS[entityId] ?? [];
  const fieldSet = new Set(availableFields);
  const detectedSource = preferredDataSource ?? detectDataSource(availableFields);

  return metrics.filter((metric) => {
    // Check all required fields exist
    const hasRequiredFields = metric.requiredFields.every((f) => fieldSet.has(f));
    if (!hasRequiredFields) return false;

    // If we detected a data source, prefer matching metrics
    if (detectedSource && metric.dataSource !== detectedSource) {
      // Get the base metric name (without _otel, _ecs suffix)
      const baseMetricId = metric.id.replace(/_otel|_ecs$/, '');

      // Check if there's a matching data source metric that's also available
      const hasMatchingSourceMetric = metrics.some((m) => {
        const mBaseId = m.id.replace(/_otel|_ecs$/, '');
        return (
          mBaseId === baseMetricId &&
          m.dataSource === detectedSource &&
          m.requiredFields.every((f) => fieldSet.has(f))
        );
      });

      // Exclude this metric if there's a better match for the detected source
      return !hasMatchingSourceMetric;
    }

    return true;
  });
};

/**
 * Get all curated metrics for an entity (regardless of availability)
 *
 * @param entityId - The entity ID (e.g., 'host', 'k8s.pod')
 * @returns Array of all curated metrics for the entity
 */
export const getCuratedMetricsForEntity = (entityId: string): CuratedMetricQuery[] => {
  return CURATED_METRICS[entityId] ?? [];
};

/**
 * Get all entity IDs that have curated metrics defined
 *
 * @returns Array of entity IDs with curated metrics
 */
export const getEntitiesWithCuratedMetrics = (): string[] => {
  return Object.keys(CURATED_METRICS);
};
