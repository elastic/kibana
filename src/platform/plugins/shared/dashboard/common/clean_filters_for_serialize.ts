/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { DashboardFilter } from '../server';

/**
 * Cleans filters for serialization by removing the `value` property from filter metadata.
 * This is necessary because the `value` property is not serializable and should not be persisted.
 *
 * @param filters - The array of {@link Filter} objects to clean.
 * @returns The cleaned array of {@link DashboardFilter} objects, or `undefined` if no filters are provided.
 */
export function cleanFiltersForSerialize(filters?: Filter[]): DashboardFilter[] | undefined {
  if (!filters) return;
  return filters.map((filter) => {
    if (filter.meta?.value) {
      // Create a new filter object with meta excluding 'value'
      const { value, ...metaWithoutValue } = filter.meta;
      return { ...filter, meta: metaWithoutValue };
    }
    return filter;
  });
}
