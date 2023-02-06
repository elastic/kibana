/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { FiltersParams } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { FiltersColumn, FiltersSeries } from './types';

export const convertToFiltersParams = (series: FiltersSeries): FiltersParams => {
  const splitFilters = [];
  if (series.split_mode === 'filter' && series.filter) {
    splitFilters.push({ filter: series.filter });
  }
  if (series.split_filters) {
    splitFilters.push(...series.split_filters);
  }

  return {
    filters: splitFilters?.map((param) => {
      const query = param.filter ? param.filter.query : '';
      const language = param.filter ? param.filter.language : 'kuery';
      return {
        input: {
          query,
          language,
        },
        label: param.label ?? '',
      };
    }),
  };
};

export const convertToFiltersColumn = (
  series: FiltersSeries,
  isSplit: boolean
): FiltersColumn | null => {
  const params = convertToFiltersParams(series);
  if (!params.filters.length) {
    return null;
  }

  return {
    columnId: uuidv4(),
    operationType: 'filters',
    dataType: 'string',
    isBucketed: true,
    isSplit,
    params,
  };
};
