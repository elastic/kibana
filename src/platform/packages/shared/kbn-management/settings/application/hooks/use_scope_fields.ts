/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import type { Query } from '@elastic/eui';
import type { FieldDefinition } from '@kbn/management-settings-types';
import { useFields } from './use_fields';

/**
 * React hook which retrieves the fields for each scope (`namespace` and `global`)
 * and returns every {@link FieldDefinition} in each scope along with the subset that matches the
 * query.
 * @param options.query The {@link Query} to execute for filtering the fields.
 * @param options.includeGlobal When false, global settings are not fetched, and the global field
 * collections are empty.
 * @returns An object with the all and filtered {@link FieldDefinition} arrays for each scope, a
 * loading flag, the error of each scope that failed to load, and a function that fetches the
 * failed scopes again.
 */
export const useScopeFields = ({
  query,
  includeGlobal,
}: {
  query?: Query;
  includeGlobal: boolean;
}): {
  spaceAllFields: FieldDefinition[];
  spaceFilteredFields: FieldDefinition[];
  globalAllFields: FieldDefinition[];
  globalFilteredFields: FieldDefinition[];
  isLoading: boolean;
  spaceError?: Error;
  globalError?: Error;
  retry: () => void;
} => {
  const {
    allFields: spaceAllFields,
    filteredFields: spaceFilteredFields,
    isLoading: spaceLoading,
    error: spaceError,
    retry: retrySpace,
  } = useFields('namespace', query);
  const {
    allFields: globalAllFields,
    filteredFields: globalFilteredFields,
    isLoading: globalLoading,
    error: globalError,
    retry: retryGlobal,
  } = useFields('global', query, includeGlobal);

  const retry = useCallback(() => {
    if (spaceError) {
      retrySpace();
    }
    if (globalError) {
      retryGlobal();
    }
  }, [spaceError, globalError, retrySpace, retryGlobal]);

  return {
    spaceAllFields,
    spaceFilteredFields,
    globalAllFields,
    globalFilteredFields,
    isLoading: spaceLoading || globalLoading,
    spaceError,
    globalError,
    retry,
  };
};
