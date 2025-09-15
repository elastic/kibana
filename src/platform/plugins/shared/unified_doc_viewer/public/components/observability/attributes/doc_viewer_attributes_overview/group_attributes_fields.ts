/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AttributeField } from './attributes_overview';
import { getAttributeDisplayName } from './get_attribute_display_name';

interface GroupAttributesFieldsParams {
  allFields: string[];
  flattened: Record<string, unknown>;
  searchTerm: string;
  shouldShowFieldHandler: (fieldName: string) => boolean;
  isEsqlMode: boolean;
  areNullValuesHidden?: boolean;
}

export function groupAttributesFields({
  allFields,
  flattened,
  searchTerm,
  shouldShowFieldHandler,
  isEsqlMode,
  areNullValuesHidden,
}: GroupAttributesFieldsParams): {
  attributesFields: AttributeField[];
  resourceAttributesFields: AttributeField[];
  scopeAttributesFields: AttributeField[];
} {
  const attributesFields: AttributeField[] = [];
  const resourceAttributesFields: AttributeField[] = [];
  const scopeAttributesFields: AttributeField[] = [];
  const lowerSearchTerm = searchTerm.toLowerCase();

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

  return { attributesFields, resourceAttributesFields, scopeAttributesFields };
}
