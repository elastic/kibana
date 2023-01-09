/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PhrasesFilter } from './phrases_filter';
import { isPhraseFilter } from './phrase_filter';
import { isRangeFilter } from './range_filter';
import { Filter, FILTERS } from './types';

/**
 * @internal used only by the filter bar to create filter pills.
 */
export function getFilterParams(filter: Filter): Filter['meta']['params'] {
  switch (filter.meta.type) {
    case FILTERS.PHRASE:
      if (isPhraseFilter(filter)) {
        return filter.meta.params?.query;
      }
    case FILTERS.PHRASES:
      return (filter as PhrasesFilter).meta.params;
    case FILTERS.RANGE:
      if (isRangeFilter(filter) && filter.meta.params) {
        const { gte, gt, lte, lt } = filter.meta.params;
        return {
          from: gte ?? gt,
          to: lt ?? lte,
        };
      }
    default:
      return filter.meta.params;
  }
}
