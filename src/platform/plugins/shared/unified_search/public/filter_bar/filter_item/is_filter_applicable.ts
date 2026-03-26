/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getIndexPatternFromFilter } from '@kbn/data-plugin/public';

import { flattenFilters } from '../lib/flatten_filters';

export const getFilterKeys = (filter: Filter): string[] => {
  const keys = flattenFilters([filter])
    .map((f) => f.meta?.key)
    .filter((key): key is string => typeof key === 'string' && key.length > 0);

  return Array.from(new Set(keys));
};

/**
 * Checks if filter field exists in any of the index patterns provided,
 * Because if so, a filter for the wrong index pattern may still be applied.
 */
export const isFilterApplicable = (filter: Filter, dataViews: DataView[]): boolean => {
  // Any filter is applicable if no data views were provided to FilterBar.
  if (!dataViews.length) return true;

  const allFields = dataViews.flatMap((dataView) => dataView.fields.map((field) => field.name));

  return flattenFilters([filter]).some((f) => {
    const ip = getIndexPatternFromFilter(f, dataViews);
    if (ip) return true;

    const key = f.meta?.key;
    return typeof key === 'string' && key.length > 0 && allFields.includes(key);
  });
};
