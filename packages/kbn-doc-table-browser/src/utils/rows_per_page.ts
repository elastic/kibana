/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/public';

import { sortBy, uniq } from 'lodash';
import { DEFAULT_ROWS_PER_PAGE, ROWS_PER_PAGE_OPTIONS } from '../constants';
import { SAMPLE_ROWS_PER_PAGE_SETTING } from '../constants';

export const getRowsPerPageOptions = (currentRowsPerPage?: number): number[] => {
  return sortBy(
    uniq(
      typeof currentRowsPerPage === 'number' && currentRowsPerPage > 0
        ? [...ROWS_PER_PAGE_OPTIONS, currentRowsPerPage]
        : ROWS_PER_PAGE_OPTIONS
    )
  );
};

export const getDefaultRowsPerPage = (uiSettings: IUiSettingsClient): number => {
  return parseInt(uiSettings.get(SAMPLE_ROWS_PER_PAGE_SETTING), 10) || DEFAULT_ROWS_PER_PAGE;
};
