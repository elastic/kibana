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
import { toElasticsearchQuery, KueryNode } from '@kbn/es-query';

import { SavedObjectsSchema } from '../../../schema';
import { SavedObjectType } from '../../../types';
import { getField } from './get_field';

/**
 *  Get the field params based on the types and searchFields
 */
function getFieldsForTypes(
  schema: SavedObjectsSchema,
  types: SavedObjectType[],
  searchFields?: string[]
) {
  if (!searchFields || !searchFields.length) {
    return {
      lenient: true,
      fields: ['*'],
    };
  }

  let fields: string[] = [];
  for (const field of searchFields) {
    fields = fields.concat(types.map(type => getField(schema, type, field)));
  }

  return { fields };
}

/**
 *  Gets the clause that will filter for the type in the namespace.
 *  Some types are namespace agnostic, so they must be treated differently.
 */
function getClauseForType(
  schema: SavedObjectsSchema,
  namespace: string | undefined,
  savedObjectType: SavedObjectType
) {
  if (namespace && !schema.isNamespaceAgnostic(savedObjectType.type)) {
    return {
      bool: {
        must: [
          { term: { type: savedObjectType.type } },
          ...(savedObjectType.subType ? [{ term: { subType: savedObjectType.subType } }] : []),
          { term: { namespace } },
        ],
      },
    };
  }

  return {
    bool: {
      must: [
        { term: { type: savedObjectType.type } },
        ...(savedObjectType.subType ? [{ term: { subType: savedObjectType.subType } }] : []),
      ],
      must_not: [{ exists: { field: 'namespace' } }],
    },
  };
}

interface HasReferenceQueryParams {
  type: string;
  id: string;
}

interface QueryParams {
  schema: SavedObjectsSchema;
  namespace?: string;
  types: SavedObjectType[];
  search?: string;
  searchFields?: string[];
  defaultSearchOperator?: string;
  hasReference?: HasReferenceQueryParams;
  kueryNode?: KueryNode;
}

/**
 *  Get the "query" related keys for the search body
 */
export function getQueryParams({
  schema,
  namespace,
  types,
  search,
  searchFields,
  defaultSearchOperator,
  hasReference,
  kueryNode,
}: QueryParams) {
  const bool: any = {
    filter: [
      ...(kueryNode != null ? [toElasticsearchQuery(kueryNode)] : []),
      {
        bool: {
          must: hasReference
            ? [
                {
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
                },
              ]
            : undefined,
          should: types.map(type => getClauseForType(schema, namespace, type)),
          minimum_should_match: 1,
        },
      },
    ],
  };

  if (search) {
    bool.must = [
      {
        simple_query_string: {
          query: search,
          ...getFieldsForTypes(schema, types, searchFields),
          ...(defaultSearchOperator ? { default_operator: defaultSearchOperator } : {}),
        },
      },
    ];
  }

  return { query: { bool } };
}
