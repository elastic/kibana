function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
import { fromKueryExpression, toElasticsearchQuery, nodeTypes } from '../kuery';
export function buildQueryFromKuery(indexPattern) {
  var queries = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var allowLeadingWildcards = arguments.length > 2 ? arguments[2] : undefined;
  var dateFormatTZ = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  var queryASTs = queries.map(function (query) {
    return fromKueryExpression(query.query, {
      allowLeadingWildcards: allowLeadingWildcards
    });
  });
  return buildQuery(indexPattern, queryASTs, {
    dateFormatTZ: dateFormatTZ
  });
}

function buildQuery(indexPattern, queryASTs) {
  var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  var compoundQueryAST = nodeTypes.function.buildNode('and', queryASTs);
  var kueryQuery = toElasticsearchQuery(compoundQueryAST, indexPattern, config);
  return _objectSpread({
    must: [],
    filter: [],
    should: [],
    must_not: []
  }, kueryQuery.bool);
}