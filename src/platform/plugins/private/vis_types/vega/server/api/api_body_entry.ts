/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiBodyEntry } from '@kbn/saved-objects-management-plugin/server';
import { prettifyError } from '@kbn/zod';
import type { StoredVegaLibraryItemState } from '../vega_saved_object';
import type { VegaLibraryItemState } from './schema';
import { parseVegaApiState } from './get_cru_response_body';
import { transformVegaIn } from './transforms/transform_vega_in';
import { updateRequestBodySchema } from './update/schemas';

/** The `vega` entry for Saved Objects Management's API body registry. */
export const vegaApiBodyEntry: ApiBodyEntry<VegaLibraryItemState, StoredVegaLibraryItemState> = {
  getSchema: () => updateRequestBodySchema,
  // Same as the public GET, which throws for a missing filter data view or an invalid stored item.
  toApi: ({ attributes, references }) => {
    const { success, data, error } = parseVegaApiState(attributes, references);
    if (!success) {
      throw new Error(`The stored item does not match the API schema: ${prettifyError(error)}`);
    }
    return { body: data, warnings: [] };
  },
  // Same as the PUT route, which puts filter data views and tags into the references.
  toStored: transformVegaIn,
};
