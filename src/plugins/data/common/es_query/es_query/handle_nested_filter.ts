/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getFilterField, cleanFilter, Filter } from '../filters';
import { IIndexPattern } from '../../index_patterns';

export const handleNestedFilter = (filter: Filter, indexPattern?: IIndexPattern) => {
  if (!indexPattern) return filter;

  const fieldName = getFilterField(filter);
  if (!fieldName) {
    return filter;
  }

  const field = indexPattern.fields.find(
    (indexPatternField) => indexPatternField.name === fieldName
  );
  if (!field || !field.subType || !field.subType.nested || !field.subType.nested.path) {
    return filter;
  }

  const query = cleanFilter(filter);

  return {
    meta: filter.meta,
    nested: {
      path: field.subType.nested.path,
      query: query.query || query,
    },
  };
};
