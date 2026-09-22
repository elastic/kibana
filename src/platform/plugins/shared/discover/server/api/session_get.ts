/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import {
  SavedObjectsErrorHelpers,
  isSavedObjectErrorResult,
  type RequestHandlerContext,
} from '@kbn/core/server';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionGetResponse } from './schema';
import { transformDiscoverSessionOut } from './transforms';

/** Returns the session and the resolution headers needed for alias redirects and conflicts. */
export const getDiscoverSession = async (
  requestContext: RequestHandlerContext,
  id: string
): Promise<{ body: DiscoverSessionGetResponse; resolveHeaders: Record<string, string> }> => {
  const { core } = await requestContext.resolve(['core']);
  const {
    saved_object: savedObject,
    outcome,
    alias_target_id: aliasTargetId,
    alias_purpose: aliasPurpose,
  } = await core.savedObjects.client.resolve<DiscoverSessionAttributes>(SavedSearchType, id);

  if (isSavedObjectErrorResult(savedObject)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, id);
  }

  const { sessionState, warnings } = transformDiscoverSessionOut(
    savedObject.attributes,
    savedObject.references
  );

  const resolveHeaders: Record<string, string> = {
    'kbn-resolve-outcome': outcome,
  };
  if (aliasTargetId) {
    resolveHeaders['kbn-resolve-alias-target-id'] = aliasTargetId;
  }
  if (aliasPurpose) {
    resolveHeaders['kbn-resolve-purpose'] = aliasPurpose;
  }

  return {
    body: {
      id: savedObject.id,
      data: sessionState,
      meta: getMeta(savedObject),
      ...(warnings.length > 0 && { warnings }),
    },
    resolveHeaders,
  };
};
