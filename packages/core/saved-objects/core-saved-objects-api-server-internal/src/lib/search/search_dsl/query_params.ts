/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as esKuery from '@kbn/es-query';
import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import {
  ALL_NAMESPACES_STRING,
  DEFAULT_NAMESPACE_STRING,
} from '@kbn/core-saved-objects-utils-server';
import { getProperty, type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { getReferencesFilter } from './references_filter';

type KueryNode = any;

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
  hasReference?: SavedObjectTypeIdTuple | SavedObjectTypeIdTuple[];
  hasReferenceOperator?: SearchOperator;
  hasNoReference?: SavedObjectTypeIdTuple | SavedObjectTypeIdTuple[];
  hasNoReferenceOperator?: SearchOperator;
  kueryNode?: KueryNode;
  mappings: IndexMapping;
}

// A de-duplicated set of namespaces makes for a more efficient query.
const uniqNamespaces = (namespacesToNormalize?: string[]) =>
  namespacesToNormalize ? Array.from(new Set(namespacesToNormalize)) : undefined;

const toArray = (val: unknown) => {
  if (typeof val === 'undefined') {
    return val;
  }
  return !Array.isArray(val) ? [val] : val;
};

/**
 *  Get the "query" related keys for the search body
 */
export function getQueryParams({
  registry,
  namespaces,
  type,
  typeToNamespacesMap,
  search,
  searchFields: searchFieldsParam = [],
  rootSearchFields,
  defaultSearchOperator,
  hasReference,
  hasReferenceOperator,
  hasNoReference,
  hasNoReferenceOperator,
  kueryNode,
  mappings,
}: QueryParams) {
  const types = getTypes(
    registry,
    typeToNamespacesMap ? Array.from(typeToNamespacesMap.keys()) : type
  );

  hasReference = toArray(hasReference);
  hasNoReference = toArray(hasNoReference);

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
      ...(hasNoReference?.length
        ? [
            getReferencesFilter({
              references: hasNoReference,
              operator: hasNoReferenceOperator,
              must: false,
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
    const { fields, nestedFields } = extractFieldsAndNestedFields({
      searchFields: searchFieldsParam,
      types,
      mappings,
    });

    const useMatchPhrasePrefix = shouldUseMatchPhrasePrefix(search);
    const isSearchingInAllFields =
      searchFieldsParam.length === 0 ||
      (searchFieldsParam.length === 1 && searchFieldsParam[0] === '*');
    const useNestedStringClause =
      nestedFields.searchFields.size > 0 && !isSearchingInAllFields && !useMatchPhrasePrefix;
    // TODO: move into extractFieldsAndNestedFields fn
    const simpleQueryOptions = useNestedStringClause
      ? { types: fields.types, searchFields: fields.searchFields }
      : {
          types,
          searchFields: searchFieldsParam,
        };

    const useSimpleQueryStringClause =
      isSearchingInAllFields || simpleQueryOptions.searchFields.length > 0;
    const useSimpleQueryStringClauseOnly = !useNestedStringClause && !useMatchPhrasePrefix;
    const useNestedStringClauseOnly = !useSimpleQueryStringClause && !useMatchPhrasePrefix;

    const simpleQueryStringClause = useSimpleQueryStringClause
      ? getSimpleQueryStringClause({
          search,
          searchFields: simpleQueryOptions.searchFields,
          types: simpleQueryOptions.types,
          rootSearchFields,
          defaultSearchOperator,
        })
      : [];

    const nestedStringClause = useNestedStringClause
      ? getNestedQueryStringClause({
          search,
          nestedFields: nestedFields.searchFields,
        })
      : [];

    const matchPhrasePrefixClause = useMatchPhrasePrefix
      ? getMatchPhrasePrefixClauses({
          search,
          searchFields: simpleQueryOptions.searchFields,
          types: simpleQueryOptions.types,
          registry,
          mappings,
        })
      : [];

    if (useSimpleQueryStringClauseOnly) {
      bool.must = [...simpleQueryStringClause];
    } else if (useNestedStringClauseOnly) {
      bool.must = [...nestedStringClause];
    } else {
      bool.should = [
        ...simpleQueryStringClause,
        ...nestedStringClause,
        ...matchPhrasePrefixClause,
      ].filter(Boolean);
      bool.minimum_should_match = 1;
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
  mappings,
}: {
  search: string;
  searchFields?: string[];
  types: string[];
  registry: ISavedObjectTypeRegistry;
  mappings: IndexMapping;
}) => {
  // need to remove the prefix search operator
  const query = search.replace(/[*]$/, '');
  const mppFields = getMatchPhrasePrefixFields({ searchFields, types, registry, mappings });
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
  mappings,
}: {
  searchFields?: string[];
  types: string[];
  registry: ISavedObjectTypeRegistry;
  mappings: IndexMapping;
}): FieldWithBoost[] => {
  const output: FieldWithBoost[] = [];

  searchFields = searchFields.filter((field) => field !== '*');
  let fields: string[];
  if (searchFields.length === 0) {
    fields = types.reduce((typeFields, type) => {
      const defaultSearchField = registry.getType(type)?.management?.defaultSearchField;
      if (defaultSearchField) {
        typeFields.push(`${type}.${defaultSearchField}`);
      }
      return typeFields;
    }, [] as string[]);
  } else {
    fields = [];
    for (const field of searchFields) {
      fields = fields.concat(
        types
          .map((type) => `${type}.${field}`)
          .filter((absoluteFieldPath) => {
            const parentNode = absoluteFieldPath.split('.').slice(0, -1).join('.');
            const parentNodeType = getProperty(mappings, parentNode)?.type;
            return parentNodeType !== 'nested';
          })
      );
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

const extractFieldsAndNestedFields = ({
  searchFields,
  types,
  mappings,
}: {
  searchFields: string[];
  types: string[];
  mappings: IndexMapping;
}) => {
  const usedFields: Set<string> = new Set();
  const typesUsedByFields: Set<string> = new Set();
  const usedNestedFields: Map<string, string[]> = new Map();

  types.forEach((type) => {
    searchFields.forEach((rawSearchField) => {
      const isFieldDefinedAsNested = rawSearchField.split('.').length > 1;
      // Keeps the prefix only when boosting or wildcard
      const searchField = rawSearchField.replace(/[*^].$/, '');
      const isBoostedOrWildcard = rawSearchField !== searchField;
      const absoluteFieldPath = `${type}.${searchField}`;
      const nodeType = getProperty(mappings, absoluteFieldPath)?.type;
      const parentNode = absoluteFieldPath.split('.').slice(0, -1).join('.');
      const parentNodeType = getProperty(mappings, parentNode)?.type;

      if (isFieldDefinedAsNested) {
        if (nodeType !== undefined) {
          if (parentNodeType === 'nested') {
            usedNestedFields.set(parentNode, [
              ...(usedNestedFields.get(parentNode) || []),
              absoluteFieldPath,
            ]);
          } else {
            usedFields.add(rawSearchField);
            typesUsedByFields.add(type);
          }
        }
      } else if (isBoostedOrWildcard || (nodeType !== undefined && nodeType !== 'nested')) {
        usedFields.add(rawSearchField);
        typesUsedByFields.add(type);
      }
    });
  });

  return {
    fields: {
      types: Array.from(typesUsedByFields),
      searchFields: Array.from(usedFields.values()),
    },
    nestedFields: {
      searchFields: usedNestedFields,
    },
  };
};

/**
 * Returns an array of clauses because there for each type we need to create a nested query
 */
const getNestedQueryStringClause = ({
  search,
  nestedFields,
}: {
  search: string;
  nestedFields: Map<string, string[]>;
}) => {
  if (nestedFields.size === 0) {
    return [];
  }

  return Array.from(nestedFields.entries()).map(([path, fields]) => {
    return {
      nested: {
        path,
        query: {
          simple_query_string: {
            query: search,
            fields,
          },
        },
      },
    };
  });
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
  return [
    {
      simple_query_string: {
        query: search,
        ...getSimpleQueryStringTypeFields(types, searchFields, rootSearchFields),
        ...(defaultSearchOperator ? { default_operator: defaultSearchOperator } : {}),
      },
    },
  ];
};
