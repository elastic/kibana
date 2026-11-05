/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import { prettifyError } from '@kbn/zod';
import type { StoredVegaLibraryItemState } from '../vega_saved_object';
import { vegaLibraryItemSchema } from './schema';
import { transformVegaOut } from './transforms/transform_vega_out';

// CRU is Create, Read, Update
export const getVegaCRUResponseBody = (
  savedObject:
    | SavedObject<StoredVegaLibraryItemState>
    | SavedObjectsUpdateResponse<StoredVegaLibraryItemState>
) => {
  // Route does not apply defaults to response
  // Instead, call parse to ensure defaults are applied to response
  const { success, data, error } = vegaLibraryItemSchema.safeParse(
    transformVegaOut(savedObject.attributes, savedObject.references)
  );
  if (!success) {
    // The stored item is the problem, not the request. A plain error results in a 500 response.
    throw new Error(
      `Vega library item ${savedObject.id} does not match the response schema: ${prettifyError(
        error
      )}`
    );
  }

  return {
    id: savedObject.id,
    data,
    meta: getMeta(savedObject),
  };
};
