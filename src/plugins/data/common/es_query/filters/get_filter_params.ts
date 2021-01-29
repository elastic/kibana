/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter, FILTERS, PhraseFilter, PhrasesFilter, RangeFilter } from '.';

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
