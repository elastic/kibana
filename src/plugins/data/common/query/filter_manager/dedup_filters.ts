/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { filter, find } from 'lodash';
import { compareFilters, FilterCompareOptions } from './compare_filters';
import { Filter } from '../../es_query';

/**
 * Combine 2 filter collections, removing duplicates
 *
 * @param {object} existingFilters - The filters to compare to
 * @param {object} filters - The filters being added
 * @param {object} comparatorOptions - Parameters to use for comparison
 *
 * @returns {object} An array of filters that were not in existing
 */
export const dedupFilters = (
  existingFilters: Filter[],
  filters: Filter[],
  comparatorOptions: FilterCompareOptions = {}
) => {
  if (!Array.isArray(filters)) {
    filters = [filters];
  }

  return filter(
    filters,
    (f: Filter) =>
      !find(existingFilters, (existingFilter: Filter) =>
        compareFilters(existingFilter, f, comparatorOptions)
      )
  );
};
