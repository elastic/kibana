/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '../../../../common';
import { DataView } from '../../../../../data_views/public';

export function getIndexPatternFromFilter(
  filter: Filter,
  indexPatterns: DataView[]
): DataView | undefined {
  return indexPatterns.find((indexPattern) => indexPattern.id === filter.meta.index);
}
