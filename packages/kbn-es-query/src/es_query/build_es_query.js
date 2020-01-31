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

import { groupBy, has } from 'lodash';
import { buildQueryFromKuery } from './from_kuery';
import { buildQueryFromFilters } from './from_filters';
import { buildQueryFromLucene } from './from_lucene';

/**
 * @param indexPattern
 * @param queries - a query object or array of query objects. Each query has a language property and a query property.
 * @param filters - a filter object or array of filter objects
 * @param config - an objects with query:allowLeadingWildcards and query:queryString:options UI
 * settings in form of { allowLeadingWildcards, queryStringOptions }
 * config contains dateformat:tz
 */
export function buildEsQuery(
  indexPattern,
  queries = [],
  filters = [],
  config = {
    allowLeadingWildcards: false,
    queryStringOptions: {},
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: null,
  }
) {
  queries = Array.isArray(queries) ? queries : [queries];
  filters = Array.isArray(filters) ? filters : [filters];

  const validQueries = queries.filter(query => has(query, 'query'));
  const queriesByLanguage = groupBy(validQueries, 'language');
  const kueryQuery = buildQueryFromKuery(
    indexPattern,
    queriesByLanguage.kuery,
    config.allowLeadingWildcards,
    config.dateFormatTZ
  );
  const luceneQuery = buildQueryFromLucene(
    queriesByLanguage.lucene,
    config.queryStringOptions,
    config.dateFormatTZ
  );
  const filterQuery = buildQueryFromFilters(
    filters,
    indexPattern,
    config.ignoreFilterIfFieldNotInIndex
  );

  return {
    bool: {
      must: [].concat(kueryQuery.must, luceneQuery.must, filterQuery.must),
      filter: [].concat(kueryQuery.filter, luceneQuery.filter, filterQuery.filter),
      should: [].concat(kueryQuery.should, luceneQuery.should, filterQuery.should),
      must_not: [].concat(kueryQuery.must_not, luceneQuery.must_not, filterQuery.must_not),
    },
  };
}
