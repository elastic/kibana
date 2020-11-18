/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PluginStart as DataPluginStart, IEsSearchRequest } from 'src/plugins/data/server';
import { schema } from '@kbn/config-schema';
import { IEsSearchResponse } from 'src/plugins/data/common';
import { IRouter } from '../../../../src/core/server';
import { SERVER_SEARCH_ROUTE_PATH } from '../../common';

export function registerServerSearchRoute(router: IRouter, data: DataPluginStart) {
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
