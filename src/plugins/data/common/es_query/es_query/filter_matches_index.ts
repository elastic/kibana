/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IFieldType } from '../../index_patterns';
import { Filter } from '../filters';
import { MinimalIndexPattern } from './types';

/*
 * TODO: We should base this on something better than `filter.meta.key`. We should probably modify
 * this to check if `filter.meta.index` matches `indexPattern.id` instead, but that's a breaking
 * change.
 */
export function filterMatchesIndex(filter: Filter, indexPattern?: MinimalIndexPattern | null) {
  if (!filter.meta?.key || !indexPattern) {
    return true;
  }

  // Fixes https://github.com/elastic/kibana/issues/89878
  // Custom filters may refer multiple fields. Validate the index id only.
  if (filter.meta?.type === 'custom') {
    return filter.meta.index === indexPattern.id;
  }

  return indexPattern.fields.some((field: IFieldType) => field.name === filter.meta.key);
}
