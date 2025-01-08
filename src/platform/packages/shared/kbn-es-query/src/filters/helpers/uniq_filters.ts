/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { each, union } from 'lodash';
import type { Filter, FilterCompareOptions } from '..';
import { dedupFilters } from './dedup_filters';

/**
 * Remove duplicate filters from an array of filters
 *
 * @param {array} filters The filters to remove duplicates from
 * @param {object} comparatorOptions - Parameters to use for comparison
 * @returns {object} The original filters array with duplicates removed
 * @public
 */
export const uniqFilters = (filters: Filter[], comparatorOptions: FilterCompareOptions = {}) => {
  let results: Filter[] = [];

  each(filters, (filter: Filter) => {
    results = union(results, dedupFilters(results, [filter], comparatorOptions));
  });

  return results;
};
