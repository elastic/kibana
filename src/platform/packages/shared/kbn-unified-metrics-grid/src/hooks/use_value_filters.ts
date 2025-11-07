/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { FIELD_VALUE_SEPARATOR } from '../common/constants';

export const useValueFilters = (valueFilters?: string[]) => {
  return useMemo(() => {
    if (!valueFilters?.length) {
      return { kuery: undefined, filters: [] };
    }

    const filtersMap = new Map<string, string[]>();
    const filters: Array<{ field: string; value: string }> = [];

    // Build both filters array and map in single pass
    valueFilters.forEach((filter) => {
      const [field, value] = filter.split(FIELD_VALUE_SEPARATOR);
      if (field !== '') {
        // Build filters array
        filters.push({ field, value });

        // Build map with quoted values for kuery
        const arr = filtersMap.get(field) || [];
        arr.push(`"${value}"`);
        filtersMap.set(field, arr);
      }
    });

    // Build kuery from map
    const kuery = Array.from(filtersMap.entries())
      .map(([field, values]) =>
        values.length > 1 ? `${field}:(${values.join(' or ')})` : `${field}:${values[0]}`
      )
      .join(' and ');

    return { kuery, filters };
  }, [valueFilters]);
};
