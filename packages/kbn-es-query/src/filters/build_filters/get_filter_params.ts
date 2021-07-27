/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PhrasesFilter } from './phrases_filter';
import type { PhraseFilter } from './phrase_filter';
import type { RangeFilter } from './range_filter';
import { Filter, FILTERS } from './types';

export function getFilterParams(filter: Filter) {
  switch (filter.meta.type) {
    case FILTERS.PHRASE:
      return (filter as PhraseFilter).meta.params.query;
    case FILTERS.PHRASES:
      return (filter as PhrasesFilter).meta.params;
    case FILTERS.RANGE:
      const { gte, gt, lte, lt } = (filter as RangeFilter).meta.params;
      return {
        from: gte ?? gt,
        to: lt ?? lte,
      };
  }
}
