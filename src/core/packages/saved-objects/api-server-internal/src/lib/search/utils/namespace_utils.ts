/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import {
  ALL_NAMESPACES_STRING,
  DEFAULT_NAMESPACE_STRING,
} from '@kbn/core-saved-objects-utils-server';

// A de-duplicated set of namespaces makes for a more efficient query.
export const uniqNamespaces = (namespacesToNormalize?: string[]) =>
  namespacesToNormalize ? Array.from(new Set(namespacesToNormalize)) : undefined;

/**
 *  Gets the clause that will filter for the type in the namespace.
 *  Some types are namespace agnostic, so they must be treated differently.
 */
export function getClauseForType(
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
