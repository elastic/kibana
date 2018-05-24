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

import { getRootProperties } from '../../../../mappings';

/**
 *  Get the field params based on the types and searchFields
 *  @param  {Array<string>} searchFields
 *  @param  {Array<string>} types
 *  @return {Object}
 */
function getFieldsForTypes(searchFields, types) {
  if (!searchFields || !searchFields.length) {
    return {
      all_fields: true
    };
  }

  return {
    fields: searchFields.reduce((acc, field) => [
      ...acc,
      ...types.map(prefix => `${prefix}.${field}`)
    ], []),
  };
}

/**
 *  Get the "query" related keys for the search body
 *  @param  {EsMapping} mapping mappings from Ui
 *  @param  {Object} type
 *  @param  {String} search
 *  @param  {Array<string>} searchFields
 *  @return {Object}
 */
export function getQueryParams(mappings, type, search, searchFields, includeTypes) {
  if (!type && !search) {
    if (includeTypes) {
      return {
        query: {
          bool: {
            should: includeTypes.map(includeType => ({
              term: {
                type: includeType,
              }
            }))
          }
        }
      };
    }

    return {};
  }

  const bool = {};

  if (type) {
    bool.filter = [
      { term: { type } }
    ];
  }

  if (includeTypes) {
    bool.must = [
      {
        bool: {
          should: includeTypes.map(includeType => ({
            term: {
              type: includeType,
            }
          })),
        }
      }
    ];
  }

  if (search) {
    bool.must = [
      ...bool.must || [],
      {
        simple_query_string: {
          query: search,
          ...getFieldsForTypes(
            searchFields,
            type ? [type] : Object.keys(getRootProperties(mappings)),
          )
        }
      }
    ];
  }

  return { query: { bool } };
}
