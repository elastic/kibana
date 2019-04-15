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

import { fromLegacyKueryExpression, fromKueryExpression, toElasticsearchQuery, nodeTypes } from '../kuery';

export function buildQueryFromKuery(indexPattern, queries = [], allowLeadingWildcards, dateFormatTZ = null) {
  const queryASTs = queries.map(query => {
    try {
      return fromKueryExpression(query.query, { allowLeadingWildcards });
    } catch (parseError) {
      try {
        fromLegacyKueryExpression(query.query);
      } catch (legacyParseError) {
        throw parseError;
      }
      throw Error('OutdatedKuerySyntaxError');
    }
  });
  return buildQuery(indexPattern, queryASTs, { dateFormatTZ });
}

function buildQuery(indexPattern, queryASTs, config = null) {
  const compoundQueryAST = nodeTypes.function.buildNode('and', queryASTs);
  const kueryQuery = toElasticsearchQuery(compoundQueryAST, indexPattern, config);
  return {
    must: [],
    filter: [],
    should: [],
    must_not: [],
    ...kueryQuery.bool
  };
}
