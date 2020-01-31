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
import { decorateQuery } from './decorate_query';
import { luceneStringToDsl } from './lucene_string_to_dsl';

export function buildQueryFromLucene(queries, queryStringOptions, dateFormatTZ = null) {
  const combinedQueries = _.map(queries, query => {
    const queryDsl = luceneStringToDsl(query.query);
    return decorateQuery(queryDsl, queryStringOptions, dateFormatTZ);
  });

  return {
    must: [].concat(combinedQueries),
    filter: [],
    should: [],
    must_not: [],
  };
}
