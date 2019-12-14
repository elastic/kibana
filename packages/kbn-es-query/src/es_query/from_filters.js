/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { migrateFilter } from './migrate_filter';
import { filterMatchesIndex } from './filter_matches_index';

/**
 * Create a filter that can be reversed for filters with negate set
 * @param {boolean} reverse This will reverse the filter. If true then
 *                          anything where negate is set will come
 *                          through otherwise it will filter out
 * @returns {function}
 */
const filterNegate = function(reverse) {
  return function(filter) {
    if (_.isUndefined(filter.meta) || _.isUndefined(filter.meta.negate)) return !reverse;
    return filter.meta && filter.meta.negate === reverse;
  };
};

/**
 * Translate a filter into a query to support es 5+
 * @param  {Object} filter - The filter to translate
 * @return {Object} the query version of that filter
 */
const translateToQuery = function(filter) {
  if (!filter) return;

  if (filter.query) {
    return filter.query;
  }

  return filter;
};

/**
 * Clean out any invalid attributes from the filters
 * @param {object} filter The filter to clean
 * @returns {object}
 */
const cleanFilter = function(filter) {
  return _.omit(filter, ['meta', '$state']);
};

export function buildQueryFromFilters(filters = [], indexPattern, ignoreFilterIfFieldNotInIndex) {
  return {
    must: [],
    filter: filters
      .filter(filterNegate(false))
      .filter(filter => !ignoreFilterIfFieldNotInIndex || filterMatchesIndex(filter, indexPattern))
      .map(translateToQuery)
      .map(cleanFilter)
      .map(filter => {
        return migrateFilter(filter, indexPattern);
      }),
    should: [],
    must_not: filters
      .filter(filterNegate(true))
      .filter(filter => !ignoreFilterIfFieldNotInIndex || filterMatchesIndex(filter, indexPattern))
      .map(translateToQuery)
      .map(cleanFilter)
      .map(filter => {
        return migrateFilter(filter, indexPattern);
      }),
  };
}
