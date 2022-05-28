/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as esKuery from '@kbn/es-query';

type KueryNode = any;

import { ISavedObjectTypeRegistry } from '../../../saved_objects_type_registry';
import { ALL_NAMESPACES_STRING, DEFAULT_NAMESPACE_STRING } from '../utils';
import { getReferencesFilter } from './references_filter';

/**
 * Gets the types based on the type. Uses mappings to support
 * null type (all types), a single type string or an array
 */
function getTypes(registry: ISavedObjectTypeRegistry, type?: string | string[]) {
  if (!type) {
    return registry.getAllTypes().map((registeredType) => registeredType.name);
  }
  return Array.isArray(type) ? type : [type];
}

/**
 *  Get the field params based on the types, searchFields, and rootSearchFields
 */
function getSimpleQueryStringTypeFields(
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
    const typeFilterClause = { term: { type } };

    const namespacesFilterClause = {
      terms: { namespaces: [...namespaces, ALL_NAMESPACES_STRING] },
    };

    const must = searchAcrossAllNamespaces
      ? [typeFilterClause]
      : [typeFilterClause, namespacesFilterClause];

    return {
      bool: {
        must,
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

// A de-duplicated set of namespaces makes for a more efficient query.
const uniqNamespaces = (namespacesToNormalize?: string[]) =>
  namespacesToNormalize ? Array.from(new Set(namespacesToNormalize)) : undefined;

/**
 *  Get the "query" related keys for the search body
 */
export function getQueryParams({
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
    registry,
    typeToNamespacesMap ? Array.from(typeToNamespacesMap.keys()) : type
  );

  if (hasReference && !Array.isArray(hasReference)) {
    hasReference = [hasReference];
  }

  const bool: any = {
    filter: [
      ...(kueryNode != null ? [esKuery.toElasticsearchQuery(kueryNode)] : []),
      ...(hasReference?.length
        ? [
            getReferencesFilter({
              references: hasReference,
              operator: hasReferenceOperator,
            }),
          ]
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
    const useMatchPhrasePrefix = shouldUseMatchPhrasePrefix(search);
    const simpleQueryStringClause = getSimpleQueryStringClause({
      search,
      types,
      searchFields,
      rootSearchFields,
      defaultSearchOperator,
    });

    if (useMatchPhrasePrefix) {
      bool.should = [
        simpleQueryStringClause,
        ...getMatchPhrasePrefixClauses({ search, searchFields, types, registry }),
      ];
      bool.minimum_should_match = 1;
    } else {
      bool.must = [simpleQueryStringClause];
    }
  }

  return { query: { bool } };
}

// we only want to add match_phrase_prefix clauses
// if the search is a prefix search
const shouldUseMatchPhrasePrefix = (search: string): boolean => {
  return search.trim().endsWith('*');
};

const getMatchPhrasePrefixClauses = ({
  search,
  searchFields,
  registry,
  types,
}: {
  search: string;
  searchFields?: string[];
  types: string[];
  registry: ISavedObjectTypeRegistry;
}) => {
  // need to remove the prefix search operator
  const query = search.replace(/[*]$/, '');
  const mppFields = getMatchPhrasePrefixFields({ searchFields, types, registry });
  return mppFields.map(({ field, boost }) => {
    return {
      match_phrase_prefix: {
        [field]: {
          query,
          boost,
        },
      },
    };
  });
};

interface FieldWithBoost {
  field: string;
  boost?: number;
}

const getMatchPhrasePrefixFields = ({
  searchFields = [],
  types,
  registry,
}: {
  searchFields?: string[];
  types: string[];
  registry: ISavedObjectTypeRegistry;
}): FieldWithBoost[] => {
  const output: FieldWithBoost[] = [];

  searchFields = searchFields.filter((field) => field !== '*');
  let fields: string[];
  if (searchFields.length === 0) {
    fields = types.reduce((typeFields, type) => {
      const defaultSearchField = registry.getType(type)?.management?.defaultSearchField;
      if (defaultSearchField) {
        return [...typeFields, `${type}.${defaultSearchField}`];
      }
      return typeFields;
    }, [] as string[]);
  } else {
    fields = [];
    for (const field of searchFields) {
      fields = fields.concat(types.map((type) => `${type}.${field}`));
    }
  }

  fields.forEach((rawField) => {
    const [field, rawBoost] = rawField.split('^');
    let boost: number = 1;
    if (rawBoost) {
      try {
        boost = parseInt(rawBoost, 10);
      } catch (e) {
        boost = 1;
      }
    }
    if (isNaN(boost)) {
      boost = 1;
    }
    output.push({
      field,
      boost,
    });
  });
  return output;
};

const getSimpleQueryStringClause = ({
  search,
  types,
  searchFields,
  rootSearchFields,
  defaultSearchOperator,
}: {
  search: string;
  types: string[];
  searchFields?: string[];
  rootSearchFields?: string[];
  defaultSearchOperator?: SearchOperator;
}) => {
  return {
    simple_query_string: {
      query: search,
      ...getSimpleQueryStringTypeFields(types, searchFields, rootSearchFields),
      ...(defaultSearchOperator ? { default_operator: defaultSearchOperator } : {}),
    },
  };
};
