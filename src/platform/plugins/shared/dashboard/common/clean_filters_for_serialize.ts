/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, FilterMeta } from '@kbn/es-query';
import { isCombinedFilter } from '@kbn/es-query';
import type { DashboardFilter } from '../server';

const removeUndefinedProperty = <T extends Record<string, any>>(obj: T, key: string): T => {
  const cleanedMeta: T = { ...obj };
  if (cleanedMeta[key] === undefined) {
    delete cleanedMeta[key];
  }
  return cleanedMeta;
};

export function cleanFiltersForSerialize(filters?: Filter[]): DashboardFilter[] | undefined {
  if (!filters) return;
  return filters.map((filter) => {
    const cleanedFilter = { ...filter };
    if (cleanedFilter.meta?.value) {
      // Create a new filter object with meta excluding 'value'
      const { value, ...metaWithoutValue } = cleanedFilter.meta;
      cleanedFilter.meta = metaWithoutValue;
    }

    cleanedFilter.meta = removeUndefinedProperty<Filter['meta']>(cleanedFilter.meta, 'key');
    cleanedFilter.meta = removeUndefinedProperty<Filter['meta']>(cleanedFilter.meta, 'alias');

    if (isCombinedFilter(filter) && filter.meta?.params) {
      // Recursively clean filters in combined filters
      cleanedFilter.meta.params = cleanFiltersForSerialize(
        cleanedFilter.meta.params as Filter[]
      ) as FilterMeta['params'];
    }

    return cleanedFilter;
  });
}
