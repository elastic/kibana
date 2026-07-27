/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import { SavedObjectsErrorHelpers, type RequestHandlerContext } from '@kbn/core/server';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiResponse } from './schema';
import { transformDiscoverSessionOut } from './transforms';

export const getDiscoverSession = async (
  requestContext: RequestHandlerContext,
  id: string
): Promise<DiscoverSessionApiResponse> => {
  const { core } = await requestContext.resolve(['core']);
  const result = await core.savedObjects.client.resolve<DiscoverSessionAttributes>(
    SavedSearchType,
    id
  );

  if (result.outcome === 'conflict') {
    throw SavedObjectsErrorHelpers.createConflictError(SavedSearchType, id);
  }

  const savedObject = result.saved_object;

  return {
    id: savedObject.id,
    data: transformDiscoverSessionOut(savedObject.attributes, savedObject.references),
    meta: getMeta(savedObject),
  };
};
