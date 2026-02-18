/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import { MARKDOWN_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { MarkdownSearchRequestBody, MarkdownSearchResponseBody } from './types';
import { getMarkdownMeta } from '../../saved_object_utils';
import type { MarkdownAttributes } from '../../markdown_saved_object';

export async function search(
  requestCtx: RequestHandlerContext,
  searchBody: MarkdownSearchRequestBody
): Promise<MarkdownSearchResponseBody> {
  const { core } = await requestCtx.resolve(['core']);
  const soResponse = await core.savedObjects.client.find<MarkdownAttributes>({
    type: MARKDOWN_SAVED_OBJECT_TYPE,
    searchFields: ['title^3', 'description'],
    fields: ['description', 'title'],
    search: searchBody.search,
    perPage: searchBody.per_page,
    page: searchBody.page ? +searchBody.page : undefined,
    defaultSearchOperator: 'AND',
  });

  return {
    markdowns: soResponse.saved_objects.map((so) => {
      const { description, title } = so.attributes;

      return {
        id: so.id,
        data: {
          ...(description && { description }),
          title: title ?? '',
        },
        meta: getMarkdownMeta(so, 'search'),
      };
    }),
    page: soResponse.page,
    total: soResponse.total,
  };
}
