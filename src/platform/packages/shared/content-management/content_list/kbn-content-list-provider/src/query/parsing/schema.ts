/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilteringConfig } from '../../features/filtering';

/** Schema type for `EuiSearchBar` query parsing. */
export interface QuerySchema {
  strict: boolean;
  fields: Record<string, { type: 'boolean' | 'string' | 'number' | 'date' }>;
}

/**
 * Gets all custom filter field keys from the filtering config.
 * All custom filters (both single-select and multi-select) are parsed from query text.
 */
export const getAllCustomFilterKeys = (filteringConfig: FilteringConfig | undefined): string[] => {
  if (!filteringConfig?.custom) {
    return [];
  }
  return Object.keys(filteringConfig.custom);
};

/**
 * Builds a dynamic schema for query parsing based on filtering config.
 * Includes base fields (`starred`, `createdBy`) plus all custom filter fields.
 */
export const buildQuerySchema = (
  customFilterKeys: string[],
  options: { strict?: boolean } = {}
): QuerySchema => {
  const fields: Record<string, { type: 'boolean' | 'string' | 'number' | 'date' }> = {
    starred: { type: 'boolean' },
    createdBy: { type: 'string' },
  };

  // Add all custom filter fields to the schema.
  customFilterKeys.forEach((key) => {
    fields[key] = { type: 'string' };
  });

  return { strict: options.strict ?? true, fields };
};
