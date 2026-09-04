/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import { toAsCodeTags } from '@kbn/as-code-shared-transforms';
import { findWithTagFilter } from '@kbn/as-code-utils';
import type { RequestHandlerContext } from '@kbn/core/server';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionSearchParams, DiscoverSessionSearchResponse } from './schema';

export const searchDiscoverSessions = async (
  requestContext: RequestHandlerContext,
  params: DiscoverSessionSearchParams
): Promise<DiscoverSessionSearchResponse> => {
  const { core } = await requestContext.resolve(['core']);
  const { query, page, per_page: perPage } = params;

  const findResponse = await findWithTagFilter<DiscoverSessionAttributes>(
    core.savedObjects.client,
    {
      type: SavedSearchType,
      search: query,
      searchFields: ['title^3', 'description'],
      fields: ['title', 'description'],
      page,
      perPage,
      defaultSearchOperator: 'AND',
    },
    params
  );

  return {
    data: findResponse.saved_objects.map((savedObject) => ({
      id: savedObject.id,
      data: {
        title: savedObject.attributes.title,
        description: savedObject.attributes.description,
        tags: toAsCodeTags(savedObject.references).tags,
      },
      meta: getMeta(savedObject),
    })),
    meta: {
      page: findResponse.page,
      per_page: findResponse.per_page,
      total: findResponse.total,
    },
  };
};
