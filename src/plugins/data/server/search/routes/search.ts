/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { first } from 'rxjs/operators';
import { schema } from '@kbn/config-schema';
import type { IRouter } from 'src/core/server';
import { getRequestAbortedSignal } from '../../lib';
import { shimHitsTotal } from './shim_hits_total';
import { reportServerError } from '../../../../kibana_utils/server';

export function registerSearchRoute(router: IRouter): void {
  router.post(
    {
      path: '/internal/search/{strategy}/{id?}',
      validate: {
        params: schema.object({
          strategy: schema.string(),
          id: schema.maybe(schema.string()),
        }),

        query: schema.object({}, { unknowns: 'allow' }),

        body: schema.object(
          {
            sessionId: schema.maybe(schema.string()),
            isStored: schema.maybe(schema.boolean()),
            isRestore: schema.maybe(schema.boolean()),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, request, res) => {
      const { sessionId, isStored, isRestore, ...searchRequest } = request.body;
      const { strategy, id } = request.params;
      const abortSignal = getRequestAbortedSignal(request.events.aborted$);

      try {
        const response = await context
          .search!.search(
            { ...searchRequest, id },
            {
              abortSignal,
              strategy,
              sessionId,
              isStored,
              isRestore,
            }
          )
          .pipe(first())
          .toPromise();

        return res.ok({
          body: {
            ...response,
            ...{
              rawResponse: shimHitsTotal(response.rawResponse),
            },
          },
        });
      } catch (err) {
        return reportServerError(res, err);
      }
    }
  );

  router.delete(
    {
      path: '/internal/search/{strategy}/{id}',
      validate: {
        params: schema.object({
          strategy: schema.string(),
          id: schema.string(),
        }),

        query: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, res) => {
      const { strategy, id } = request.params;

      try {
        await context.search!.cancel(id, { strategy });
        return res.ok();
      } catch (err) {
        return reportServerError(res, err);
      }
    }
  );
}
