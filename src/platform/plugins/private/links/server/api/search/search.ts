/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta, PAGINATION_DEFAULT_PER_PAGE } from '@kbn/as-code-shared-schemas';
import { resolveTagsToFindOptions } from '@kbn/as-code-utils';
import type { RequestHandlerContext } from '@kbn/core/server';
import { LINKS_LIBRARY_TYPE } from '../../../common/constants';
import type { StoredLinksState } from '../../links_saved_object';
import type { LinksSearchRequestParams, LinksSearchResponseBody } from './types';

export async function search(
  requestCtx: RequestHandlerContext,
  searchParams: LinksSearchRequestParams
): Promise<LinksSearchResponseBody> {
  const { core } = await requestCtx.resolve(['core']);

  const tagsFindOptions = await resolveTagsToFindOptions(searchParams, core.savedObjects.client);
  // short-circuit when a tags filter was requested but no matching tags exist
  if (tagsFindOptions === null) {
    return {
      data: [],
      meta: {
        page: searchParams.page ?? 1,
        per_page: searchParams.per_page ?? PAGINATION_DEFAULT_PER_PAGE,
        total: 0,
      },
    };
  }

  const soResponse = await core.savedObjects.client.find<StoredLinksState>({
    type: LINKS_LIBRARY_TYPE,
    searchFields: ['title^3', 'description'],
    fields: ['description', 'title'],
    search: searchParams.query,
    perPage: searchParams.per_page,
    page: searchParams.page ? +searchParams.page : undefined,
    defaultSearchOperator: 'AND',
    ...tagsFindOptions,
  });

  return {
    data: soResponse.saved_objects.map((so) => {
      const { description, title } = so.attributes;

      return {
        id: so.id,
        data: {
          ...(description && { description }),
          title,
        },
        meta: getMeta(so),
      };
    }),
    meta: { page: soResponse.page, per_page: soResponse.per_page, total: soResponse.total },
  };
}
