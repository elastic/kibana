/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { isRefreshIntervalValid, isTimeRangeValid } from '../../../../utils/validate_time';
import type { TabStateGlobalState } from '../redux';

export const restoreStateFromSavedSearch = ({ savedSearch }: { savedSearch: SavedSearch }) => {
  if (!savedSearch) {
    return {};
  }

  const isTimeBased = savedSearch.searchSource.getField('index')?.isTimeBased();

  if (!isTimeBased) {
    return {};
  }

  const globalStateUpdate: Partial<TabStateGlobalState> = {};

  if (savedSearch.timeRestore && savedSearch.timeRange && isTimeRangeValid(savedSearch.timeRange)) {
    globalStateUpdate.timeRange = savedSearch.timeRange;
  }
  if (
    savedSearch.timeRestore &&
    savedSearch.refreshInterval &&
    isRefreshIntervalValid(savedSearch.refreshInterval)
  ) {
    globalStateUpdate.refreshInterval = savedSearch.refreshInterval;
  }

  return globalStateUpdate;
};
