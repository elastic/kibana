/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter } from '../filters';
import { IIndexPattern } from '../..';

export function getIndexPatternFromFilter(
  filter: Filter,
  indexPatterns: IIndexPattern[]
): IIndexPattern | undefined {
  return indexPatterns.find((indexPattern) => indexPattern.id === filter.meta.index);
}
