/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import type { RequestHandlerContext } from '@kbn/core/server';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiData, DiscoverSessionApiResponse } from './schema';
import { transformDiscoverSessionIn, transformDiscoverSessionOut } from './transforms';

export const createDiscoverSession = async (
  requestContext: RequestHandlerContext,
  data: DiscoverSessionApiData
): Promise<DiscoverSessionApiResponse> => {
  const { core } = await requestContext.resolve(['core']);
  const { attributes, references } = transformDiscoverSessionIn(data);

  const savedObject = await core.savedObjects.client.create<DiscoverSessionAttributes>(
    SavedSearchType,
    attributes,
    { references }
  );

  return {
    id: savedObject.id,
    data: transformDiscoverSessionOut(savedObject.attributes, savedObject.references),
    meta: getMeta(savedObject),
  };
};
