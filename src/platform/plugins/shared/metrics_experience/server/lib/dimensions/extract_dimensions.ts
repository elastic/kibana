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

export function extractDimensions(
  fields: Record<string, Record<string, FieldCapsFieldCapability>>,
  filter?: string[]
): Array<Dimension> {
  const dims: Array<Dimension> = [];

  // Get all dimension field names for batch description lookup
  const dimensionFieldNames = Object.entries(fields)
    .filter(([fieldName, fieldInfo]) => {
      if (fieldName === '_metric_names_hash') return false;
      return Object.values(fieldInfo).some(
        (typeInfo) =>
          typeInfo.time_series_dimension === true && (!filter || filter.includes(fieldName))
      );
    })
    .map(([fieldName]) => fieldName);

  // TODO: this needs to be replaed by the FieldsMetadataService
  const ecsDescriptions = getEcsFieldDescriptions(dimensionFieldNames);

  for (const [fieldName, fieldInfo] of Object.entries(fields)) {
    if (fieldName === '_metric_names_hash') continue;

    for (const [type, typeInfo] of Object.entries(fieldInfo)) {
      if (typeInfo.time_series_dimension === true && (!filter || filter.includes(fieldName))) {
        // Get description from various sources (priority: field caps -> metadata service)
        const fieldCapsDescription = Array.isArray(typeInfo.meta?.description)
          ? typeInfo.meta.description.join(', ')
          : typeInfo.meta?.description;
        const ecsDescription = ecsDescriptions.get(fieldName);
        const description = fieldCapsDescription || ecsDescription;

        dims.push({
          name: fieldName,
          type,
          description,
        });
      }
    }
  }

  return dims;
}
