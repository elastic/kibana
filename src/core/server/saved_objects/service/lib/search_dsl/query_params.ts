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
// @ts-expect-error no ts
import { esKuery } from '../../../es_query';
type KueryNode = any;

import { getRootPropertiesObjects, IndexMapping } from '../../../mappings';
import { ISavedObjectTypeRegistry } from '../../../saved_objects_type_registry';
import { ALL_NAMESPACES_STRING, DEFAULT_NAMESPACE_STRING } from '../utils';

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
 *  Get the field params based on the types, searchFields, and rootSearchFields
 */
function getFieldsForTypes(
  types: string[],
  searchFields: string[] = [],
  rootSearchFields: string[] = []
) {
  if (!searchFields.length && !rootSearchFields.length) {
    return {
      lenient: true,
      fields: ['*'],
    };
  }

  let fields = [...rootSearchFields];
  fields.forEach((field) => {
    if (field.indexOf('.') !== -1) {
      throw new Error(`rootSearchFields entry "${field}" is invalid: cannot contain "." character`);
    }
  });

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
  namespaces: string[] = [DEFAULT_NAMESPACE_STRING],
  type: string
) {
  if (namespaces.length === 0) {
    throw new Error('cannot specify empty namespaces array');
  }
  const searchAcrossAllNamespaces = namespaces.includes(ALL_NAMESPACES_STRING);

  if (registry.isMultiNamespace(type)) {
    const namespacesFilterClause = searchAcrossAllNamespaces
      ? {}
      : { terms: { namespaces: [...namespaces, ALL_NAMESPACES_STRING] } };

    return {
      bool: {
        must: [{ term: { type } }, namespacesFilterClause],
        must_not: [{ exists: { field: 'namespace' } }],
      },
    };
  } else if (registry.isSingleNamespace(type)) {
    const should: Array<Record<string, any>> = [];
    const eligibleNamespaces = namespaces.filter((x) => x !== DEFAULT_NAMESPACE_STRING);
    if (eligibleNamespaces.length > 0 && !searchAcrossAllNamespaces) {
      should.push({ terms: { namespace: eligibleNamespaces } });
    }
    if (namespaces.includes(DEFAULT_NAMESPACE_STRING)) {
      should.push({ bool: { must_not: [{ exists: { field: 'namespace' } }] } });
    }

    const shouldClauseProps =
      should.length > 0
        ? {
            should,
            minimum_should_match: 1,
          }
        : {};

    return {
      bool: {
        must: [{ term: { type } }],
        ...shouldClauseProps,
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

export interface HasReferenceQueryParams {
  type: string;
  id: string;
}

export type SearchOperator = 'AND' | 'OR';

interface QueryParams {
  mappings: IndexMapping;
  registry: ISavedObjectTypeRegistry;
  namespaces?: string[];
  type?: string | string[];
  typeToNamespacesMap?: Map<string, string[] | undefined>;
  search?: string;
  defaultSearchOperator?: SearchOperator;
  searchFields?: string[];
  rootSearchFields?: string[];
  hasReference?: HasReferenceQueryParams | HasReferenceQueryParams[];
  hasReferenceOperator?: SearchOperator;
  kueryNode?: KueryNode;
}

function getReferencesFilter(
  references: HasReferenceQueryParams[],
  operator: SearchOperator = 'OR'
) {
  if (operator === 'AND') {
    return {
      bool: {
        must: references.map(getClauseForReference),
      },
    };
  } else {
    return {
      bool: {
        should: references.map(getClauseForReference),
        minimum_should_match: 1,
      },
    };
  }
}

export function getClauseForReference(reference: HasReferenceQueryParams) {
  return {
    nested: {
      path: 'references',
      query: {
        bool: {
          must: [
            {
              term: {
                'references.id': reference.id,
              },
            },
            {
              term: {
                'references.type': reference.type,
              },
            },
          ],
        },
      },
    },
  };
}

/**
 *  Get the "query" related keys for the search body
 */
export function getQueryParams({
  mappings,
  registry,
  namespaces,
  type,
  typeToNamespacesMap,
  search,
  searchFields,
  rootSearchFields,
  defaultSearchOperator,
  hasReference,
  hasReferenceOperator,
  kueryNode,
}: QueryParams) {
  const types = getTypes(
    mappings,
    typeToNamespacesMap ? Array.from(typeToNamespacesMap.keys()) : type
  );

  if (hasReference && !Array.isArray(hasReference)) {
    hasReference = [hasReference];
  }

  // A de-duplicated set of namespaces makes for a more effecient query.
  const uniqNamespaces = (namespacesToNormalize?: string[]) =>
    namespacesToNormalize ? Array.from(new Set(namespacesToNormalize)) : undefined;

  const bool: any = {
    filter: [
      ...(kueryNode != null ? [esKuery.toElasticsearchQuery(kueryNode)] : []),
      ...(hasReference && hasReference.length
        ? [getReferencesFilter(hasReference, hasReferenceOperator)]
        : []),
      {
        bool: {
          should: types.map((shouldType) => {
            const deduplicatedNamespaces = uniqNamespaces(
              typeToNamespacesMap ? typeToNamespacesMap.get(shouldType) : namespaces
            );
            return getClauseForType(registry, deduplicatedNamespaces, shouldType);
          }),
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
          ...getFieldsForTypes(types, searchFields, rootSearchFields),
          ...(defaultSearchOperator ? { default_operator: defaultSearchOperator } : {}),
        },
      },
    ];
  }

  return { query: { bool } };
}
