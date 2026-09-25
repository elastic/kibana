/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionApiData } from '@kbn/as-code-discover-schema';
import { asCodeIdSchema, getMeta } from '@kbn/as-code-shared-schemas';
import type { RequestHandlerContext, SavedObject } from '@kbn/core/server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiResponse } from './schema';
import {
  createStoredDiscoverSession,
  getStoredDiscoverSession,
  updateStoredDiscoverSession,
} from './stored_session';
import { transformDiscoverSessionIn, transformDiscoverSessionOut } from './transforms';
import { assignStoredInlineDataViewIds } from './transforms/assign_stored_inline_data_view_ids';

export const upsertDiscoverSession = async (
  requestContext: RequestHandlerContext,
  id: string,
  data: DiscoverSessionApiData
): Promise<{
  body: DiscoverSessionApiResponse;
  operation: 'create' | 'update';
}> => {
  const { attributes, references } = transformDiscoverSessionIn(data);

  // Check the exact ID; legacy URL aliases are resolved on read, not on write.
  const existing = await getStoredDiscoverSession(requestContext, id);

  if (!existing) {
    // Creating a session with an invalid legacy ID returns a 400 response.
    asCodeIdSchema.parse(id);

    const created = await createStoredDiscoverSession(
      requestContext,
      { attributes: assignStoredInlineDataViewIds(attributes), references },
      id
    );

    return { body: toApiResponse(created), operation: 'create' };
  }

  const updated = await updateStoredDiscoverSession(requestContext, id, {
    attributes: assignStoredInlineDataViewIds(attributes, existing.attributes),
    references,
  });

  return { body: toApiResponse(updated), operation: 'update' };
};

const toApiResponse = (savedObject: SavedObject<DiscoverSessionAttributes>) => ({
  id: savedObject.id,
  data: transformDiscoverSessionOut(savedObject.attributes, savedObject.references).sessionState,
  meta: getMeta(savedObject),
});
