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
import dateMath from '@elastic/datemath';
import { migrateFilter } from './migrate_filter';
import { filterMatchesIndex } from './filter_matches_index';
import { buildEsQuery } from './build_es_query';


const calculateBounds = function (timeRange) {
  return {
    min: dateMath.parse(timeRange.from),
    max: dateMath.parse(timeRange.to, { roundUp: true })
  };
};

/**
 * Translate a saved query timefilter into a query
 * @param  {Object} indexPattern - The indexPattern from which to extract the time filter
 * @param  {Object} timeRange - The saved query time range bounds
 * @return {Object} the query version of that filter
 */
const getEsTimeFilter = function (indexPattern, timeRange) {
  if (!indexPattern) {
    return;
  }
  const timefield = indexPattern.fields.find(
    field => field.name === indexPattern.timeFieldName
  );
  if (!timefield) {
    return;
  }
  const bounds = calculateBounds(timeRange);
  if (!bounds) {
    return;
  }
  const filter = {
    range: { [timefield.name]: { format: 'strict_date_optional_time' } },
  };
  if (bounds.min) {
    filter.range[timefield.name].gte = bounds.min.toISOString();
  }
  if (bounds.max) {
    filter.range[timefield.name].lte = bounds.max.toISOString();
  }
  return filter;
};

/**
 * Create a filter that can be reversed for filters with negate set
 * @param {boolean} reverse This will reverse the filter. If true then
 *                          anything where negate is set will come
 *                          through otherwise it will filter out
 * @returns {function}
 */
const filterNegate = function (reverse) {
  return function (filter) {
    if (_.isUndefined(filter.meta) || _.isUndefined(filter.meta.negate)) return !reverse;
    return filter.meta && filter.meta.negate === reverse;
  };
};

/**
 * Translate a filter into a query to support es 5+
 * @param  {Object} filter - The filter to translate
 * @return {Object} the query version of that filter
 */
const translateToQuery = function (filter, {
  indexPattern,
  allowLeadingWildcards = true,
  queryStringOptions = {},
  dateFormatTZ = null,
  ignoreFilterIfFieldNotInIndex = false,
}) {
  if (!filter) return;

  if (filter.query) {
    return filter.query;
  }
  if (filter.meta && filter.meta.type && filter.meta.type === 'savedQuery') {
    // do stuff: generate raw dsl that's done in the savedQuery filter constructor at the moment
    const savedQuery = filter.meta.params.savedQuery;
    const query = _.get(savedQuery, 'attributes.query');
    let filters = _.get(savedQuery, 'attributes.filters', []);
    let timefilter = _.get(savedQuery, 'attributes.timefilter');
    // timefilter addition
    if (timefilter) {
      const timeRange = { from: timefilter.from, to: timefilter.to };
      timefilter = getEsTimeFilter(indexPattern, timeRange);
      filters = [...filters, timefilter];
    }
    const convertedQuery = buildEsQuery(
      indexPattern,
      [query],
      filters,
      { allowLeadingWildcards, queryStringOptions, dateFormatTZ, ignoreFilterIfFieldNotInIndex });
    filter.query = { ...convertedQuery };
  }

  return filter;
};

/**
 * Clean out any invalid attributes from the filters
 * @param {object} filter The filter to clean
 * @returns {object}
 */
const cleanFilter = function (filter) {
  if (filter.meta && filter.meta.type && filter.meta.type === 'savedQuery') {
    return _.omit(filter, ['meta', '$state', 'saved_query']);
  }
  return _.omit(filter, ['meta', '$state']);
};

export function buildQueryFromFilters(
  filters = [],
  indexPattern,
  ignoreFilterIfFieldNotInIndex,
  allowLeadingWildcards,
  queryStringOptions,
  dateFormatTZ) {
  return {
    must: [],
    filter: filters
      .filter(filterNegate(false))
      .filter(filter => !ignoreFilterIfFieldNotInIndex || filterMatchesIndex(filter, indexPattern))
      .map((filter) => translateToQuery(
        filter,
        { indexPattern, allowLeadingWildcards, queryStringOptions, dateFormatTZ, ignoreFilterIfFieldNotInIndex }))
      .map(cleanFilter)
      .map(filter => {
        return migrateFilter(filter, indexPattern);
      }),
    should: [],
    must_not: filters
      .filter(filterNegate(true))
      .filter(filter => !ignoreFilterIfFieldNotInIndex || filterMatchesIndex(filter, indexPattern))
      .map((filter) => translateToQuery(
        filter,
        { indexPattern, allowLeadingWildcards, queryStringOptions, dateFormatTZ, ignoreFilterIfFieldNotInIndex }))
      .map(cleanFilter)
      .map(filter => {
        return migrateFilter(filter, indexPattern);
      }),
  };
}

