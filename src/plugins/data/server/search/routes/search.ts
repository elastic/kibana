/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { first } from 'rxjs/operators';
import { schema } from '@kbn/config-schema';
import { reportServerError } from '@kbn/kibana-utils-plugin/server';
import { reportSearchError } from '../report_search_error';
import { getRequestAbortedSignal } from '../../lib';
import type { DataPluginRouter } from '../types';

export const SEARCH_API_BASE_URL = '/internal/search';

export function registerSearchRoute(router: DataPluginRouter): void {
  router.versioned
    .post({
      path: `${SEARCH_API_BASE_URL}/{strategy}/{id?}`,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({
              strategy: schema.string(),
              id: schema.maybe(schema.string()),
            }),
            body: schema.object(
              {
                legacyHitsTotal: schema.maybe(schema.boolean()),
                sessionId: schema.maybe(schema.string()),
                isStored: schema.maybe(schema.boolean()),
                isRestore: schema.maybe(schema.boolean()),
              },
              { unknowns: 'allow' }
            ),
          },
        },
      },
      async (context, request, res) => {
        const {
          legacyHitsTotal = true,
          sessionId,
          isStored,
          isRestore,
          ...searchRequest
        } = request.body;
        const { strategy, id } = request.params;
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        try {
          const search = await context.search;
          const response = await search
            .search(
              { ...searchRequest, id },
              {
                abortSignal,
                strategy,
                legacyHitsTotal,
                sessionId,
                isStored,
                isRestore,
              }
            )
            .pipe(first())
            .toPromise();

          return res.ok({ body: response });
        } catch (err) {
          return reportSearchError(res, err);
        }
      }
    );

  router.versioned
    .delete({
      path: '/internal/search/{strategy}/{id}',
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({
              strategy: schema.string(),
              id: schema.string(),
            }),
          },
        },
      },
      async (context, request, res) => {
        const { strategy, id } = request.params;

        try {
          const search = await context.search;
          await search.cancel(id, { strategy });
          return res.ok();
        } catch (err) {
          return reportServerError(res, err);
        }
      }
    );
}
