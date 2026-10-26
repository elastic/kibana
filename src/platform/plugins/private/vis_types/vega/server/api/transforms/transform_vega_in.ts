/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractFilterReferences } from '@kbn/as-code-filters-transforms';
import { toStoredTags } from '@kbn/as-code-shared-transforms';
import type { SavedObjectReference } from '@kbn/core/server';
import type { StoredVegaLibraryItemState } from '../../vega_saved_object';
import type { VegaLibraryItemState } from '../schema';

/** Converts Vega library item API state to saved object attributes and references. */
export const transformVegaIn = (
  state: VegaLibraryItemState
): { attributes: StoredVegaLibraryItemState; references: SavedObjectReference[] } => {
  const { state: stateWithoutTags, references: tagReferences } = toStoredTags(state);
  const { filters, ...rest } = stateWithoutTags;
  const { filters: storedFilters, references: filterReferences } = extractFilterReferences(filters);
  return {
    attributes: { ...rest, ...(storedFilters && { filters: storedFilters }) },
    references: [...filterReferences, ...tagReferences],
  };
};
