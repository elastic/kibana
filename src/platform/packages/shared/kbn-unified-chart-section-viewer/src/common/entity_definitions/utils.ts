/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EntityDefinition } from './types';
import { ENTITY_DEFINITIONS } from './definitions';

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
