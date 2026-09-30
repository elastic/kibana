/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import type { Logger, SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { StoredVegaLibraryItemState } from '../vega_saved_object';
import { vegaLibraryItemSchema } from './schema';
import { transformVegaOut } from './transforms/transform_vega_out';

// CRU is Create, Read, Update
export const getVegaCRUResponseBody = (
  savedObject:
    | SavedObject<StoredVegaLibraryItemState>
    | SavedObjectsUpdateResponse<StoredVegaLibraryItemState>,
  logger: Logger
) => {
  return {
    id: savedObject.id,
    // Route does not apply defaults to response
    // Instead, call validate to ensure defaults are applied to response
    data: vegaLibraryItemSchema.parse(
      transformVegaOut(savedObject.attributes, savedObject.references, logger)
    ),
    meta: getMeta(savedObject),
  };
};
