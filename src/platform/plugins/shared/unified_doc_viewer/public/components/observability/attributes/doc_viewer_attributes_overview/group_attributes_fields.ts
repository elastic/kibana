/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  attributesFields: string[];
  resourceAttributesFields: string[];
  scopeAttributesFields: string[];
} {
  const attributesFields: string[] = [];
  const resourceAttributesFields: string[] = [];
  const scopeAttributesFields: string[] = [];
  const lowerSearchTerm = searchTerm.toLowerCase();

  allFields.forEach((fieldName) => {
    const lowerFieldName = fieldName.toLowerCase();

    if (!shouldShowFieldHandler(fieldName)) return;
    if (!lowerFieldName.includes(lowerSearchTerm)) return;
    if (isEsqlMode && areNullValuesHidden && flattened[fieldName] == null) return;

    if (lowerFieldName.startsWith('resource.attributes.')) {
      resourceAttributesFields.push(fieldName);
    } else if (lowerFieldName.startsWith('scope.attributes.')) {
      scopeAttributesFields.push(fieldName);
    } else if (lowerFieldName.startsWith('attributes.')) {
      attributesFields.push(fieldName);
    }
  });

  return { attributesFields, resourceAttributesFields, scopeAttributesFields };
}
