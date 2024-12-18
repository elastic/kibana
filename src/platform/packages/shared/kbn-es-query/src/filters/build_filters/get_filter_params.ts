/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPhrasesFilter, PhrasesFilter } from './phrases_filter';
import { isPhraseFilter } from './phrase_filter';
import { isRangeFilter } from './range_filter';
import { Filter } from './types';

/**
 * @internal used only by the filter bar to create filter pills.
 */
export function getFilterParams(filter: Filter): Filter['meta']['params'] {
  if (isPhraseFilter(filter)) {
    return filter.meta.params?.query;
  } else if (isPhrasesFilter(filter)) {
    return (filter as PhrasesFilter).meta.params;
  } else if (isRangeFilter(filter) && filter.meta.params) {
    const { gte, gt, lte, lt } = filter.meta.params;
    return {
      from: gte ?? gt,
      to: lt ?? lte,
    };
  } else {
    return filter.meta.params;
  }
}
