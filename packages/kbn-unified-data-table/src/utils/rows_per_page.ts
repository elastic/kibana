/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortBy, uniq } from 'lodash';

import { ROWS_PER_PAGE_OPTIONS } from '../constants';

export const getRowsPerPageOptions = (currentRowsPerPage?: number): number[] => {
  return sortBy(
    uniq(
      typeof currentRowsPerPage === 'number' && currentRowsPerPage > 0
        ? [...ROWS_PER_PAGE_OPTIONS, currentRowsPerPage]
        : ROWS_PER_PAGE_OPTIONS
    )
  );
};
