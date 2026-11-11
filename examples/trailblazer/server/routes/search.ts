/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { SearchResponseBody } from '../../common';
import { MAX_NAME_LENGTH, MAX_QUERY_LENGTH, MAX_SEARCH_SIZE, SEARCH_ROUTE } from '../../common';
import { buildQuery } from '../lib/build_query';
import { toErrorResponse } from '../lib/error_response';
import {
  expandWildcards,
  includeHiddenSchema,
  queryLanguageSchema,
  routeSecurity,
} from '../lib/route_config';

const MAX_RESULT_WINDOW = 10_000;

export function registerSearchRoute(router: IRouter) {
  router.post(
    {
      path: SEARCH_ROUTE,
      security: routeSecurity,
      validate: {
        body: schema.object({
          index: schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
          includeHidden: includeHiddenSchema,
          language: queryLanguageSchema,
          query: schema.string({ defaultValue: '', maxLength: MAX_QUERY_LENGTH }),
          size: schema.number({ defaultValue: 50, min: 0, max: MAX_SEARCH_SIZE }),
          from: schema.number({
            defaultValue: 0,
            min: 0,
            max: MAX_RESULT_WINDOW - MAX_SEARCH_SIZE,
          }),
          sortField: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH })),
        }),
      },
    },
    async (context, request, response) => {
      const { index, includeHidden, language, query, size, from, sortField } = request.body;
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;

      try {
        const result = await esClient.search<Record<string, unknown>>({
          index,
          query: buildQuery(language, query),
          size,
          from,
          track_total_hits: true,
          ignore_unavailable: true,
          expand_wildcards: expandWildcards(includeHidden),
          ...(sortField
            ? { sort: [{ [sortField]: { order: 'desc', unmapped_type: 'boolean' } }] }
            : {}),
        });

        const { total, hits } = result.hits;
        const body: SearchResponseBody = {
          total: typeof total === 'number' ? total : total?.value ?? 0,
          took: result.took,
          hits: hits.map((hit) => ({
            index: hit._index,
            id: hit._id ?? '',
            source: hit._source ?? {},
          })),
        };
        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );
}
