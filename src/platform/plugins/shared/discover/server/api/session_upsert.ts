/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeIdSchema, getMeta } from '@kbn/as-code-shared-schemas';
import type { RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiData, DiscoverSessionApiResponse } from './schema';
import { transformDiscoverSessionIn, transformDiscoverSessionOut } from './transforms';

export const upsertDiscoverSession = async (
  requestContext: RequestHandlerContext,
  id: string,
  data: DiscoverSessionApiData
): Promise<{
  body: DiscoverSessionApiResponse;
  operation: 'create' | 'update';
}> => {
  const { core } = await requestContext.resolve(['core']);
  const { attributes, references } = transformDiscoverSessionIn(data);

  try {
    await core.savedObjects.client.get<DiscoverSessionAttributes>(SavedSearchType, id);
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw error;
    }

    // Preserve legacy IDs on updates, but enforce the current format for new sessions.
    asCodeIdSchema.validate(id);
  }

  const updateResponse = await core.savedObjects.client.update<DiscoverSessionAttributes>(
    SavedSearchType,
    id,
    attributes,
    {
      upsert: attributes,
      references,
      mergeAttributes: false,
    }
  );

  const updated = await core.savedObjects.client.get<DiscoverSessionAttributes>(
    SavedSearchType,
    updateResponse.id
  );

  return {
    body: {
      id: updated.id,
      data: transformDiscoverSessionOut(updated.attributes, updated.references),
      meta: getMeta(updated),
    },
    operation: updateResponse.created_at ? 'create' : 'update',
  };
};
