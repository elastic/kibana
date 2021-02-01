/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { IndexPattern } from '../../../../data/common/index_patterns/index_patterns';

const TYPE_FIELD = '_type';

export function getFieldListFromIndexPattern(indexPattern: IndexPattern) {
  const { sourceFilters, fields } = indexPattern;
  if (!sourceFilters) {
    return ['*'];
  }
  const sourceFiltersValues = sourceFilters.map((sourceFilter) => sourceFilter.value);
  const fieldsToInclude = fields.filter((field) => {
    return !sourceFiltersValues.includes(field.name) && field.name !== TYPE_FIELD;
  });
  return fieldsToInclude.map((field) => field.name);
}
