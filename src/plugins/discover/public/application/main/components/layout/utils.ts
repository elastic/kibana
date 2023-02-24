/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Filter } from '@kbn/es-query';
import type { TimefilterContract } from '@kbn/data-plugin/public';

/**
 * Returns if true there's at least 1 active filter
 */
export function hasActiveFilter(filters: Filter[] | undefined) {
  return filters && filters.filter((f) => !f.meta?.disabled).length > 0;
}

/**
 * Get resolved time range by using now provider
 * @param timefilter
 */
export const getResolvedDateRange = (timefilter: TimefilterContract) => {
  const { from, to } = timefilter.getTime() || timefilter.getTimeDefaults() || {};
  const { min, max } =
    timefilter.calculateBounds({
      from,
      to,
    }) || {};
  return { fromDate: min?.toISOString() || from, toDate: max?.toISOString() || to };
};
