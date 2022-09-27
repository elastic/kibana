/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggParamsFilters } from '@kbn/data-plugin/common';
import uuid from 'uuid';
import { FiltersColumn } from './types';

export const convertToFiltersColumn = (
  aggId: string,
  aggParams: AggParamsFilters,
  isSplit: boolean = false
): FiltersColumn | null => {
  if (!aggParams.filters?.length) {
    return null;
  }

  return {
    columnId: uuid(),
    operationType: 'filters',
    dataType: 'string',
    isBucketed: true,
    isSplit,
    params: {
      filters: aggParams.filters ?? [],
    },
    timeShift: aggParams.timeShift,
    meta: { aggId },
  };
};
