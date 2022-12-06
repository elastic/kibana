/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter } from './types';
import { isPhraseFilter } from './phrase_filter';
import { isPhrasesFilter } from './phrases_filter';
import { isRangeFilter } from './range_filter';

/**
 * @internal used only by the filter bar to create filter pills.
 */
export function getFilterParams(filter: Filter) {
  if (isPhraseFilter(filter)) {
    return filter.meta.params?.query;
  } else if (isPhrasesFilter(filter)) {
    return filter.meta.params;
  } else if (isRangeFilter(filter)) {
    const { gte, gt, lte, lt } = filter.meta.params;
    return {
      from: gte ?? gt,
      to: lt ?? lte,
    };
  }
}
