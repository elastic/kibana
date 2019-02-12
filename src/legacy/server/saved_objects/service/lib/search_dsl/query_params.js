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

import { getRootPropertiesObjects } from '../../../../mappings';

/**
 * Gets the types based on the type. Uses mappings to support
 * null type (all types), a single type string or an array
 * @param {EsMapping} mappings
 * @param {(string|Array<string>)} type
 */
function getTypes(mappings, type) {
  if (!type) {
    return Object.keys(getRootPropertiesObjects(mappings));
  }

  if (Array.isArray(type)) {
    return type;
  }

  return [type];
}

/**
 *  Get the field params based on the types and searchFields
 *  @param  {Array<string>} searchFields
 *  @param  {string|Array<string>} types
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
 *  Gets the clause that will filter for the type in the namespace.
 *  Some types are namespace agnostic, so they must be treated differently.
 *  @param  {SavedObjectsSchema} schema
 *  @param  {string} namespace
 *  @param  {string} type
 *  @return {Object}
 */
function getClauseForType(schema, namespace, type) {
  if (!type) {
    throw new Error(`type is required to build filter clause`);
  }

  if (namespace && !schema.isNamespaceAgnostic(type)) {
    return {
      bool: {
        must: [
          { term: { type } },
          { term: { namespace } },
        ]
      }
    };
  }

  return {
    bool: {
      must: [{ term: { type } }],
      must_not: [{ exists: { field: 'namespace' } }]
    }
  };
}

/**
 *  Get the "query" related keys for the search body
 *  @param  {EsMapping} mapping mappings from Ui
 * *@param  {SavedObjectsSchema} schema
 *  @param  {(string|Array<string>)} type
 *  @param  {String} search
 *  @param  {Array<string>} searchFields
 *  @param  {String} defaultSearchOperator
 *  @param  {Object} hasReference
 *  @return {Object}
 */
export function getQueryParams(mappings, schema, namespace, type, search, searchFields, defaultSearchOperator, hasReference) {
  const types = getTypes(mappings, type);
  const bool = {
    filter: [{
      bool: {
        must: hasReference
          ? [{
            nested: {
              path: 'references',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'references.id': hasReference.id,
                      },
                    },
                    {
                      term: {
                        'references.type': hasReference.type,
                      },
                    },
                  ],
                },
              },
            },
          }]
          : undefined,
        should: types.map(type => getClauseForType(schema, namespace, type)),
        minimum_should_match: 1
      }
    }],
  };

  if (search) {
    bool.must = [
      {
        simple_query_string: {
          query: search,
          ...getFieldsForTypes(
            searchFields,
            types
          ),
          ...(defaultSearchOperator ? { default_operator: defaultSearchOperator } : {}),
        }
      }
    ];
  }

  return { query: { bool } };
}
