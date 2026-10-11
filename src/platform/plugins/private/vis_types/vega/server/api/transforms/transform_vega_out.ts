/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectFilterReferences } from '@kbn/as-code-filters-transforms';
import { toAsCodeTags } from '@kbn/as-code-shared-transforms';
import type { SavedObjectReference } from '@kbn/core/server';
import type { StoredVegaLibraryItemState } from '../../vega_saved_object';

/**
 * Converts Vega library item saved object attributes and references to API state.
 * Throws when a filter data view reference is missing. The result is not validated against the API schema.
 */
export const transformVegaOut = (
  attributes: Partial<StoredVegaLibraryItemState>,
  references: SavedObjectReference[] = []
) => {
  const { filters, ...rest } = attributes;
  const { tags } = toAsCodeTags(references);
  return {
    ...rest,
    tags,
    ...(filters && { filters: injectFilterReferences(filters, references) }),
  };
};
