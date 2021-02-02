/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IIndexPattern, IFieldType } from '../../index_patterns';
import { Filter } from '../filters';

/*
 * TODO: We should base this on something better than `filter.meta.key`. We should probably modify
 * this to check if `filter.meta.index` matches `indexPattern.id` instead, but that's a breaking
 * change.
 */
export function filterMatchesIndex(filter: Filter, indexPattern?: IIndexPattern | null) {
  if (!filter.meta?.key || !indexPattern) {
    return true;
  }
  return indexPattern.fields.some((field: IFieldType) => field.name === filter.meta.key);
}
