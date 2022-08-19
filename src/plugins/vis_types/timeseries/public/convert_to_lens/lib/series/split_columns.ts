/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Series } from '../../../../common/types';
import { convertToFiltersColumn } from '../convert';

export const getFiltersOrTermColumns = (series: Series) => {
  if (series.split_mode === 'filters' || series.split_mode === 'filter') {
    const filterColumn = convertToFiltersColumn(series, true);
    if (!filterColumn) {
      return null;
    }
    return [filterColumn];
  }
  return [];
};
