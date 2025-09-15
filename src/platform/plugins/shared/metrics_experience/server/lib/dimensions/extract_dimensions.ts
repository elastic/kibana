/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { Dimension } from '../../../common/types';
import { getEcsFieldDescriptions } from '../fields/get_ecs_field_descriptions';

const INVALID_FIELD_NAME = '_metric_names_hash';
export function extractDimensions(
  fieldCapsMap: Record<string, Record<string, FieldCapsFieldCapability>>,
  fieldNamesFilter?: string[]
): Array<Dimension> {
  const result: Map<string, Dimension> = new Map();
  const filterSet = fieldNamesFilter ? new Set(fieldNamesFilter) : undefined;

  for (const [fieldName, fieldInfo] of Object.entries(fieldCapsMap)) {
    if (fieldName === INVALID_FIELD_NAME) {
      continue;
    }

    for (const [type, typeInfo] of Object.entries(fieldInfo)) {
      if (typeInfo.time_series_dimension !== true || (filterSet && !filterSet.has(fieldName))) {
        continue;
      }

      const description = Array.isArray(typeInfo.meta?.description)
        ? typeInfo.meta.description.join(', ')
        : typeInfo.meta?.description;

      result.set(fieldName, { name: fieldName, type, description });
    }
  }

  // TODO: this needs to be replaed by the FieldsMetadataService
  const ecsDescriptions = getEcsFieldDescriptions(Array.from(result.keys()));

  for (const [fieldName, description] of ecsDescriptions) {
    const currentResult = result.get(fieldName);
    if (description && currentResult) {
      result.set(fieldName, {
        ...currentResult,
        description: currentResult.description || description,
      });
    }
  }

  return Array.from(result.values());
}
