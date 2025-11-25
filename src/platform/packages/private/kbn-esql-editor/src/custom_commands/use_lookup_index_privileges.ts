/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import { memoize } from 'lodash';
import { LOOKUP_INDEX_PRIVILEGES_ROUTE } from '@kbn/esql-types';
import type { ESQLEditorDeps } from '../types';

type IndexPrivileges = SecurityHasPrivilegesResponse['index'];

// By creating the cache at the module level, we ensure that all instances of the
// useLookupIndexPrivileges hook share the same cache. This prevents duplicate API
// calls when the hook is used multiple times in the same component tree.
// For later refactoring, we could introduce a context provider instead.
const sharedCache = new Map();

/** Helper to determine if a privilege is granted either globally (*) or for the specific index */
const hasPrivilege = (
  privileges: IndexPrivileges,
  index: string,
  permission: keyof IndexPrivileges[string]
): boolean => !!(privileges['*']?.[permission] || privileges[index]?.[permission]);

export interface LookupIndexPrivileges {
  canCreateIndex: boolean;
  canEditIndex: boolean;
  canReadIndex: boolean;
}

export const useLookupIndexPrivileges = () => {
  const {
    services: { http },
  } = useKibana<ESQLEditorDeps>();

  const memoizedFetchPrivileges = useRef(
    memoize(
      async (indexNames: string[]): Promise<IndexPrivileges> => {
        const options =
          indexNames.length > 0
            ? {
                query: {
                  indexName: indexNames.join(','),
                },
              }
            : {};
        try {
          return await http!.get<IndexPrivileges>(LOOKUP_INDEX_PRIVILEGES_ROUTE, options);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error fetching user privileges:', error);
          return {};
        }
      },
      (indexNames?: string[]) => (indexNames ? JSON.stringify([...indexNames].sort()) : 'all')
    )
  );

  // Use the shared cache for all instances of this hook.
  memoizedFetchPrivileges.current.cache = sharedCache;

  const getPermissions = useCallback(async (indexNames: string[] = []) => {
    const privileges = await memoizedFetchPrivileges.current(indexNames);

    const permissions = (indexNames.length ? indexNames : ['*']).reduce((acc, indexName) => {
      acc[indexName] = {
        canCreateIndex: hasPrivilege(privileges, indexName, 'create_index'),
        canEditIndex: hasPrivilege(privileges, indexName, 'write'),
        canReadIndex: hasPrivilege(privileges, indexName, 'read'),
      };
      return acc;
    }, {} as Record<string, LookupIndexPrivileges>);

    return permissions;
  }, []);

  return { getPermissions };
};
