/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { isRefreshIntervalValid, isTimeRangeValid } from '../../utils/validate_time';

export const restoreStateFromSavedSearch = ({
  savedSearch,
  timefilter,
}: {
  savedSearch: SavedSearch;
  timefilter: TimefilterContract;
}) => {
  if (!savedSearch) {
    return;
  }

  const isTimeBased = savedSearch.searchSource.getField('index')?.isTimeBased();

  if (!isTimeBased) {
    return;
  }

  if (savedSearch.timeRestore && savedSearch.timeRange && isTimeRangeValid(savedSearch.timeRange)) {
    timefilter.setTime(savedSearch.timeRange);
  }
  if (
    savedSearch.timeRestore &&
    savedSearch.refreshInterval &&
    isRefreshIntervalValid(savedSearch.refreshInterval)
  ) {
    timefilter.setRefreshInterval(savedSearch.refreshInterval);
  }
};
