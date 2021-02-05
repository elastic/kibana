/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IEsSearchRequest } from 'src/plugins/data/server';
import { schema } from '@kbn/config-schema';
import { IEsSearchResponse } from 'src/plugins/data/common';
import type { DataRequestHandlerContext } from 'src/plugins/data/server';
import type { IRouter } from 'src/core/server';
import { SERVER_SEARCH_ROUTE_PATH } from '../../common';

export function registerServerSearchRoute(router: IRouter<DataRequestHandlerContext>) {
  router.get(
    {
      path: SERVER_SEARCH_ROUTE_PATH,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
          field: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const { index, field } = request.query;
      // Run a synchronous search server side, by enforcing a high keepalive and waiting for completion.
      // If you wish to run the search with polling (in basic+), you'd have to poll on the search API.
      // Please reach out to the @app-arch-team if you need this to be implemented.
      const res = await context
        .search!.search(
          {
            params: {
              index,
              body: {
                aggs: {
                  '1': {
                    avg: {
                      field,
                    },
                  },
                },
              },
              waitForCompletionTimeout: '5m',
              keepAlive: '5m',
            },
          } as IEsSearchRequest,
          {}
        )
        .toPromise();

      return response.ok({
        body: {
          aggs: (res as IEsSearchResponse).rawResponse.aggregations,
        },
      });
    }
  );
}
