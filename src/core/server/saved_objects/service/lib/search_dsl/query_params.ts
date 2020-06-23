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
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { esKuery, KueryNode } from '../../../../../../plugins/data/server';

import { getRootPropertiesObjects, IndexMapping } from '../../../mappings';
import { ISavedObjectTypeRegistry } from '../../../saved_objects_type_registry';

/**
 * Gets the types based on the type. Uses mappings to support
 * null type (all types), a single type string or an array
 */
function getTypes(mappings: IndexMapping, type?: string | string[]) {
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
 */
function getFieldsForTypes(types: string[], searchFields?: string[]) {
  if (!searchFields || !searchFields.length) {
    return {
      lenient: true,
      fields: ['*'],
    };
  }

  let fields: string[] = [];
  for (const field of searchFields) {
    fields = fields.concat(types.map((prefix) => `${prefix}.${field}`));
  }

  return { fields };
}

/**
 *  Gets the clause that will filter for the type in the namespace.
 *  Some types are namespace agnostic, so they must be treated differently.
 */
function getClauseForType(
  registry: ISavedObjectTypeRegistry,
  namespace: string | undefined,
  type: string
) {
  if (registry.isMultiNamespace(type)) {
    return {
      bool: {
        must: [{ term: { type } }, { term: { namespaces: namespace ?? 'default' } }],
        must_not: [{ exists: { field: 'namespace' } }],
      },
    };
  } else if (namespace && registry.isSingleNamespace(type)) {
    return {
      bool: {
        must: [{ term: { type } }, { term: { namespace } }],
        must_not: [{ exists: { field: 'namespaces' } }],
      },
    };
  }
  // isSingleNamespace in the default namespace, or isNamespaceAgnostic
  return {
    bool: {
      must: [{ term: { type } }],
      must_not: [{ exists: { field: 'namespace' } }, { exists: { field: 'namespaces' } }],
    },
  };
}

interface HasReferenceQueryParams {
  type: string;
  id: string;
}

interface QueryParams {
  mappings: IndexMapping;
  registry: ISavedObjectTypeRegistry;
  namespace?: string;
  type?: string | string[];
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
  mappings,
  registry,
  namespace,
  type,
  search,
  searchFields,
  defaultSearchOperator,
  hasReference,
  kueryNode,
}: QueryParams) {
  const types = getTypes(mappings, type);
  const bool: any = {
    filter: [
      ...(kueryNode != null ? [esKuery.toElasticsearchQuery(kueryNode)] : []),
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
          should: types.map((shouldType) => getClauseForType(registry, namespace, shouldType)),
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
          ...getFieldsForTypes(types, searchFields),
          ...(defaultSearchOperator ? { default_operator: defaultSearchOperator } : {}),
        },
      },
    ];
  }

  return { query: { bool } };
}
