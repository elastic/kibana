/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { dedupFilters, isFilterPinned } from '@kbn/es-query';
import { logger } from '../../services/logger';

/** Skip replay when a link changes the restored query, local filters or pinned panels. */
export const haveSearchOverridesChanged = (
  restoredState: DashboardState,
  overrideState: Partial<DashboardState>
): boolean => {
  if (overrideState.query !== undefined && !deepEqual(restoredState.query, overrideState.query)) {
    return true;
  }

  if (
    overrideState.pinned_panels !== undefined &&
    !deepEqual(restoredState.pinned_panels ?? [], overrideState.pinned_panels)
  ) {
    return true;
  }

  if (overrideState.filters === undefined) {
    return false;
  }

  const restoredFilters = getLocalFilters(restoredState.filters);
  const incomingFilters = getLocalFilters(overrideState.filters);
  const compareOptions = { index: true, negate: true, group: true };

  return (
    dedupFilters(restoredFilters, incomingFilters, compareOptions).length > 0 ||
    dedupFilters(incomingFilters, restoredFilters, compareOptions).length > 0
  );
};

const getLocalFilters = (filters: DashboardState['filters']) =>
  (toStoredFilters(filters, logger) ?? []).filter(
    (filter) => !isFilterPinned(filter) && !filter.meta.disabled
  );
