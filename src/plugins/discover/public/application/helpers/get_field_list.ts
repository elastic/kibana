/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern } from '../../../../data/common/index_patterns/index_patterns';

const META_FIELDS = ['_type', '_source'];

export function getFieldListFromIndexPattern(
  indexPattern: IndexPattern,
  showUnmappedFields?: boolean
) {
  const { sourceFilters, fields } = indexPattern;
  if (!sourceFilters || sourceFilters.length === 0) {
    const allFields: Record<string, string> = { field: '*' };
    if (showUnmappedFields) {
      allFields.include_unmapped = 'true';
    }
    return [allFields];
  }
  const sourceFiltersValues = sourceFilters.map((sourceFilter) => sourceFilter.value);
  const fieldsToInclude = fields.filter((field) => {
    return !sourceFiltersValues.includes(field.name) && !META_FIELDS.includes(field.name);
  });
  return fieldsToInclude.map((field) => {
    const fieldToInclude: Record<string, string> = { field: field.name };
    if (showUnmappedFields) {
      fieldToInclude.include_unmapped = 'true';
    }
    return fieldToInclude;
  });
}
