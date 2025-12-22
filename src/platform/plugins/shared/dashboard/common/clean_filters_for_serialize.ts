/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isCombinedFilter, type Filter } from '@kbn/es-query';
import type { DashboardFilter } from '../server';

export function cleanFiltersForSerialize(filters?: Filter[]): DashboardFilter[] | undefined {
  if (!filters) return;
  return filters.map((filter) => {
    const cleanedFilter = { ...filter };
    if (cleanedFilter.meta?.value === undefined) {
      // Create a new filter object with meta excluding 'value'
      const { value, ...metaWithoutValue } = cleanedFilter.meta;
      cleanedFilter.meta = metaWithoutValue;
    }

    if (cleanedFilter.meta?.key === undefined) {
      // Create a new filter object with meta excluding 'key'
      const { key, ...metaWithoutKey } = cleanedFilter.meta;
      cleanedFilter.meta = metaWithoutKey;
    }

    if (cleanedFilter.meta?.alias === undefined) {
      // Create a new filter object with meta excluding 'alias'
      const { alias, ...metaWithoutAlias } = cleanedFilter.meta;
      cleanedFilter.meta = metaWithoutAlias;
    }

    if (isCombinedFilter(filter) && filter.meta?.params) {
      cleanedFilter.meta.params = cleanFiltersForSerialize(cleanedFilter.meta.params as Filter[]);
    }

    return cleanedFilter;
  });
}
