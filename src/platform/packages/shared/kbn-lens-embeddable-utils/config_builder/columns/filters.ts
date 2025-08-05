/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FiltersIndexPatternColumn } from '@kbn/lens-plugin/public';
import { LensApiFilterOperation } from '../schema/bucket_ops';

export const getFiltersColumn = (options: LensApiFilterOperation): FiltersIndexPatternColumn => {
  const { filters = [], ...params } = options;
  return {
    label: `Filters`,
    dataType: 'number',
    operationType: 'filters',
    scale: 'ordinal',
    isBucketed: true,
    params: {
      filters,
      ...params,
    },
  };
};

export const fromFiltersColumn = (column: FiltersIndexPatternColumn): LensApiFilterOperation => {
  const { params } = column;
  return {
    operation: 'filters',
    filters: params.filters.map((filter) => ({
      query: {
        query: filter.input.query as string,
        language: filter.input.language as 'kuery' | 'lucene',
      },
      label: filter.label,
    })),
  };
};
