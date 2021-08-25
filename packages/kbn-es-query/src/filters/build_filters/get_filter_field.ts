/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getExistsFilterField, isExistsFilter } from './exists_filter';
import { getMissingFilterField, isMissingFilter } from './missing_filter';
import { getPhrasesFilterField, isPhrasesFilter } from './phrases_filter';
import { getPhraseFilterField, isPhraseFilter } from './phrase_filter';
import { getRangeFilterField, isRangeFilter } from './range_filter';
import type { Filter } from './types';

/** @internal */
export const getFilterField = (filter: Filter) => {
  if (isExistsFilter(filter)) {
    return getExistsFilterField(filter);
  }
  if (isPhraseFilter(filter)) {
    return getPhraseFilterField(filter);
  }
  if (isPhrasesFilter(filter)) {
    return getPhrasesFilterField(filter);
  }
  if (isRangeFilter(filter)) {
    return getRangeFilterField(filter);
  }
  if (isMissingFilter(filter)) {
    return getMissingFilterField(filter);
  }

  return;
};
