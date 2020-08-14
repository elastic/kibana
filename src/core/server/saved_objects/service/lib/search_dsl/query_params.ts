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
  namespaces: string[] = ['default'],
  type: string
) {
  if (namespaces.length === 0) {
    throw new Error('cannot specify empty namespaces array');
  }
  if (registry.isMultiNamespace(type)) {
    return {
      bool: {
        must: [{ term: { type } }, { terms: { namespaces } }],
        must_not: [{ exists: { field: 'namespace' } }],
      },
    };
  } else if (registry.isSingleNamespace(type)) {
    const should: Array<Record<string, any>> = [];
    const eligibleNamespaces = namespaces.filter((namespace) => namespace !== 'default');
    if (eligibleNamespaces.length > 0) {
      should.push({ terms: { namespace: eligibleNamespaces } });
    }
    if (namespaces.includes('default')) {
      should.push({ bool: { must_not: [{ exists: { field: 'namespace' } }] } });
    }
    if (should.length === 0) {
      // This is indicitive of a bug, and not user error.
      throw new Error('unhandled search condition: expected at least 1 `should` clause.');
    }
    return {
      bool: {
        must: [{ term: { type } }],
        should,
        minimum_should_match: 1,
        must_not: [{ exists: { field: 'namespaces' } }],
      },
    };
  }
  // isNamespaceAgnostic
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
  namespaces?: string[];
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
  namespaces,
  type,
  search,
  searchFields,
  defaultSearchOperator,
  hasReference,
  kueryNode,
}: QueryParams) {
  const types = getTypes(mappings, type);

  // A de-duplicated set of namespaces makes for a more effecient query.
  //
  // Additonally, we treat the `*` namespace as the `default` namespace.
  // In the Default Distribution, the `*` is automatically expanded to include all available namespaces.
  // However, the OSS distribution (and certain configurations of the Default Distribution) can allow the `*`
  // to pass through to the SO Repository, and eventually to this module. When this happens, we translate to `default`,
  // since that is consistent with how a single-namespace search behaves in the OSS distribution. Leaving the wildcard in place
  // would result in no results being returned, as the wildcard is treated as a literal, and not _actually_ as a wildcard.
  // We had a good discussion around the tradeoffs here: https://github.com/elastic/kibana/pull/67644#discussion_r441055716
  const normalizedNamespaces = namespaces
    ? Array.from(
        new Set(namespaces.map((namespace) => (namespace === '*' ? 'default' : namespace)))
      )
    : undefined;

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
          should: types.map((shouldType) =>
            getClauseForType(registry, normalizedNamespaces, shouldType)
          ),
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
