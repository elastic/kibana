/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFilterField, cleanFilter, Filter } from '../filters';
import { DataViewBase } from './types';
import { getDataViewFieldSubtypeNested } from '../utils';

/** @internal */
export const handleNestedFilter = (filter: Filter, indexPattern?: DataViewBase) => {
  if (!indexPattern) return filter;

  const fieldName = getFilterField(filter);
  if (!fieldName) {
    return filter;
  }

  const field = indexPattern.fields.find(
    (indexPatternField) => indexPatternField.name === fieldName
  );

  const subTypeNested = field && getDataViewFieldSubtypeNested(field);
  if (!subTypeNested) {
    return filter;
  }

  const query = cleanFilter(filter);

  return {
    meta: filter.meta,
    query: {
      nested: {
        path: subTypeNested.nested.path,
        query: query.query || query,
      },
    },
  };
};
