/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectFilterReferences } from '@kbn/as-code-filters-transforms';
import type { SavedObjectReference } from '@kbn/core/server';
import type { StoredVegaLibraryItemState } from '../../vega_saved_object';
import { vegaLibraryItemSchema, type VegaLibraryItemState } from '../schema';

/**
 * Converts Vega library item saved object attributes and references to validated API state.
 * Throws when a filter data view reference is missing or the state does not satisfy the API schema.
 */
export const transformVegaOut = (
  attributes: Partial<StoredVegaLibraryItemState>,
  references: SavedObjectReference[] = []
): VegaLibraryItemState => {
  const { filters, ...rest } = attributes;
  return vegaLibraryItemSchema.parse({
    ...rest,
    ...(filters && { filters: injectFilterReferences(filters, references) }),
  });
};
