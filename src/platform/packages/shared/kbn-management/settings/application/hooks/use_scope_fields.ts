/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Query } from '@elastic/eui';
import type { FieldDefinition } from '@kbn/management-settings-types';
import { useFields } from './use_fields';

/**
 * React hook which retrieves the fields for each scope (`namespace` and `global`)
 * and returns two collections of {@link FieldDefinition} objects.
 * @param query The {@link Query} to execute for filtering the fields.
 * @returns An object with two arrays of {@link FieldDefinition} objects, a loading flag, and the
 * error if either scope failed to load.
 */
export const useScopeFields = (
  query?: Query
): {
  spaceFields: FieldDefinition[];
  globalFields: FieldDefinition[];
  isLoading: boolean;
  error?: Error;
} => {
  const {
    fields: spaceFields,
    isLoading: spaceLoading,
    error: spaceError,
  } = useFields('namespace', query);
  const {
    fields: globalFields,
    isLoading: globalLoading,
    error: globalError,
  } = useFields('global', query);
  return {
    spaceFields,
    globalFields,
    isLoading: spaceLoading || globalLoading,
    error: spaceError ?? globalError,
  };
};
