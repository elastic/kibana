/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AttributeField } from './attributes_overview';
import { getAttributeDisplayName } from './get_attribute_display_name';

/**
 * Helper to flatten nested objects into dot-notation keys
 */
function flattenObject(obj: Record<string, unknown>, prefix: string = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

interface GroupAttributesFieldsParams {
  allFields: string[];
  flattened: Record<string, unknown>;
  searchTerm: string;
  shouldShowFieldHandler: (fieldName: string) => boolean;
  isEsqlMode: boolean;
  areNullValuesHidden?: boolean;
  source?: Record<string, unknown>; // _source data for unmapped fields
}

export function groupAttributesFields({
  allFields,
  flattened,
  searchTerm,
  shouldShowFieldHandler,
  isEsqlMode,
  areNullValuesHidden,
  source,
}: GroupAttributesFieldsParams): {
  attributesFields: AttributeField[];
  resourceAttributesFields: AttributeField[];
  scopeAttributesFields: AttributeField[];
} {
  const attributesFields: AttributeField[] = [];
  const resourceAttributesFields: AttributeField[] = [];
  const scopeAttributesFields: AttributeField[] = [];
  const lowerSearchTerm = searchTerm.toLowerCase();

  // Process fields from flattened hit
  allFields.forEach((fieldName) => {
    const lowerFieldName = fieldName.toLowerCase();

    if (!shouldShowFieldHandler(fieldName)) return;
    if (!lowerFieldName.includes(lowerSearchTerm)) return;
    if (isEsqlMode && areNullValuesHidden && flattened[fieldName] == null) return;

    const field: AttributeField = {
      name: fieldName,
      displayName: getAttributeDisplayName(fieldName),
    };

    if (lowerFieldName.startsWith('resource.attributes.')) {
      resourceAttributesFields.push(field);
    } else if (lowerFieldName.startsWith('scope.attributes.')) {
      scopeAttributesFields.push(field);
    } else if (lowerFieldName.startsWith('attributes.')) {
      attributesFields.push(field);
    }
  });

  // Also check _source for unmapped fields with attributes.* or resource.attributes.* prefix
  if (source) {
    const flattenedSource = flattenObject(source);
    const processedFields = new Set(allFields); // Track to avoid duplicates

    Object.keys(flattenedSource).forEach((sourceFieldName) => {
      const lowerSourceFieldName = sourceFieldName.toLowerCase();

      // Extract the field name without the attributes prefix
      let targetFieldName: string | null = null;
      let targetGroup: AttributeField[] | null = null;

      if (lowerSourceFieldName.startsWith('attributes.')) {
        targetFieldName = sourceFieldName.substring('attributes.'.length);
        targetGroup = attributesFields;
      } else if (lowerSourceFieldName.startsWith('resource.attributes.')) {
        targetFieldName = sourceFieldName.substring('resource.attributes.'.length);
        targetGroup = resourceAttributesFields;
      } else if (lowerSourceFieldName.startsWith('scope.attributes.')) {
        targetFieldName = sourceFieldName.substring('scope.attributes.'.length);
        targetGroup = scopeAttributesFields;
      }

      if (!targetFieldName || !targetGroup) return;
      if (processedFields.has(targetFieldName)) return; // Skip if already in mapped fields

      const lowerTargetFieldName = targetFieldName.toLowerCase();
      if (!lowerTargetFieldName.includes(lowerSearchTerm)) return;

      const value = flattenedSource[sourceFieldName];
      if (isEsqlMode && areNullValuesHidden && value == null) return;

      targetGroup.push({
        name: targetFieldName,
        displayName: getAttributeDisplayName(targetFieldName),
      });
      processedFields.add(targetFieldName);
    });
  }

  return { attributesFields, resourceAttributesFields, scopeAttributesFields };
}
