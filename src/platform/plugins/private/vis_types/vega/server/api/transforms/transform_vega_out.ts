/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { prettifyError } from '@kbn/zod';
import { asCodeFilterSchema, type AsCodeFilter } from '@kbn/as-code-filters-schema';
import { injectFilterReference } from '@kbn/as-code-filters-transforms';
import type { Logger, SavedObjectReference } from '@kbn/core/server';
import type { StoredVegaLibraryItemState } from '../../vega_saved_object';

/**
 * Converts Vega library item saved object attributes and references to API state.
 * Filters that can not be restored are dropped and logged.
 */
export const transformVegaOut = (
  attributes: Partial<StoredVegaLibraryItemState>,
  references: SavedObjectReference[] = [],
  logger: Logger
): Omit<Partial<StoredVegaLibraryItemState>, 'filters'> & { filters?: AsCodeFilter[] } => {
  const { filters: storedFilters, ...rest } = attributes;
  if (!storedFilters) {
    return rest;
  }

  const filters: AsCodeFilter[] = [];
  storedFilters.forEach((storedFilter, index) => {
    let filter: AsCodeFilter;
    try {
      filter = injectFilterReference(storedFilter, references);
    } catch (error) {
      logger.warn(`Dropped Vega library item filter [filters.${index}]: ${error.message}`);
      return;
    }

    const result = asCodeFilterSchema.safeParse(filter);
    if (!result.success) {
      logger.warn(
        `Dropped Vega library item filter [filters.${index}]: ${prettifyError(result.error)}`
      );
      return;
    }
    filters.push(result.data);
  });

  return { ...rest, filters };
};
