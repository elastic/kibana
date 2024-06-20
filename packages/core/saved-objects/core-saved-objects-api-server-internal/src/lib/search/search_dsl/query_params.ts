/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as esKuery from '@kbn/es-query';
import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import {
  ALL_NAMESPACES_STRING,
  DEFAULT_NAMESPACE_STRING,
} from '@kbn/core-saved-objects-utils-server';
import { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { getProperty } from '@kbn/core-saved-objects-base-server-internal/src/mappings/lib/get_property';
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
  types: string[], // TODO: remove this
  searchFields: Map<string, string[]> = new Map(),
  rootSearchFields: string[] = []
) {
  if (!searchFields.size && !rootSearchFields.length) {
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

  for (const [prefix, fieldsWithoutPrefix] of searchFields) {
    fields = fields.concat(fieldsWithoutPrefix.map((field) => `${prefix}.${field}`));
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
  mappings?: IndexMapping;
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
  searchFields,
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
    const useMatchPhrasePrefix = shouldUseMatchPhrasePrefix(search);
    // TODO: I would guess mappings are always present except in test. Check this.
    if (mappings) {
      const searchStringQuery = getSearchStringQuery({
        search,
        types,
        searchFields,
        rootSearchFields,
        defaultSearchOperator,
        mappings,
      });

      if (useMatchPhrasePrefix) {
        bool.should = [
          searchStringQuery,
          ...getMatchPhrasePrefixClauses({ search, searchFields, types, registry }),
        ];
        bool.minimum_should_match = 1;
      } else {
        bool.must = searchStringQuery;
      }
    } else {
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
        typeFields.push(`${type}.${defaultSearchField}`);
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

/**
 * Generates an array of subpaths in reverse order from a given string by splitting it at each '.' and incrementally joining the parts.
 * Includes the current path and the rest of the input in each subpath.
 * @param input - The input string to generate subpaths from.
 * @returns An array of objects with 'current' path and 'rest' of the input in reverse order.
 */
function generateReverseSubPathsWithRest(input: string): Array<{ path: string; rest: string }> {
  const parts = input.split('.');
  return (
    parts
      .map((_, index) => {
        const path = parts.slice(0, index + 1).join('.');
        const rest = parts.slice(index + 1).join('.');
        return { path, rest };
      })
      // .filter(({ rest }: { rest: string }) => Boolean(rest))
      .reverse()
  );
}

// TODO: should this fn search for nested field inside nested fields?
const getAllFields = ({ mappings, type }: { mappings: IndexMapping; type: string }) => {
  const allFields = [];
  const props = mappings.properties[type].properties;
  for (const field in props) {
    if (props.hasOwnProperty(field)) {
      allFields.push(field);
    }
  }

  return allFields;
};

const getSearchStringQuery = ({
  search,
  types,
  searchFields: searchFieldsParam = [],
  rootSearchFields,
  defaultSearchOperator,
  mappings,
}: {
  search: string;
  types: string[];
  searchFields?: string[];
  rootSearchFields?: string[];
  defaultSearchOperator?: SearchOperator;
  mappings: IndexMapping;
}) => {
  const nestedFields: Map<string, string[]> = new Map();
  const fields: Map<string, string[]> = new Map();

  const isSearchFieldsSet =
    searchFieldsParam.length > 0 ||
    (searchFieldsParam.length === 1 && searchFieldsParam[0] !== '*');

  types.forEach((prefix) => {
    const searchFields = isSearchFieldsSet
      ? searchFieldsParam
      : getAllFields({ mappings, type: prefix });

    console.log({ searchFieldsParam, isSearchFieldsSet, searchFields });

    searchFields.forEach((field) => {
      const absoluteFieldPath = `${prefix}.${field}`;
      const paths = generateReverseSubPathsWithRest(absoluteFieldPath);
      console.log({ paths });
      let foundNestedField = false;
      for (const { path, rest: fieldPath } of paths) {
        console.log(`testing ${path}`);
        if (getProperty(mappings, path)?.type === 'nested') {
          const nestedPath = path;
          console.log(`new nested field ${nestedPath}.${fieldPath}`);
          nestedFields.set(nestedPath, [...(nestedFields.get(nestedPath) || []), fieldPath]);
          foundNestedField = true;
          break;
        } else {
          console.log('not nested');
        }
      }

      const absolutePathType: string | undefined = getProperty(mappings, absoluteFieldPath)?.type;
      if (!foundNestedField && absolutePathType !== 'nested' && absolutePathType !== undefined) {
        fields.set(prefix, [...(fields.get(prefix) || []), field]);
      }
    });
  });
  console.log({ fields, nestedFields });
  const nestedQueries = getNestedQueryStringClause({
    nestedFields,
    search,
    isSearchFieldsSet,
  });

  const simpleQueryString = getSimpleQueryStringClause({
    search,
    types,
    searchFields: fields,
    rootSearchFields,
    defaultSearchOperator,
  });

  return { bool: { should: [...nestedQueries, simpleQueryString].filter(Boolean) } };
};

/**
 * Returns an array of clauses because there for each type we need to create a nested query
 */
const getNestedQueryStringClause = ({
  search,
  nestedFields,
  isSearchFieldsSet,
}: {
  search: string;
  nestedFields: Map<string, string[]>;
  isSearchFieldsSet: boolean;
}) => {
  if (nestedFields.size === 0) {
    return [];
  }

  // TODO: what about the defaultSearchOperator? Do we need to pass it here?
  return Array.from(nestedFields.entries()).map(([path, fields]) => {
    return {
      nested: {
        path,
        query: {
          simple_query_string: {
            query: search,
            fields: isSearchFieldsSet ? fields.map((field: string) => `${path}.${field}`) : ['*'],
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
  searchFields?: Map<string, string[]>;
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
