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

import { first } from 'rxjs/operators';
import { schema } from '@kbn/config-schema';

import { SearchResponse } from 'elasticsearch';
import { IRouter } from 'src/core/server';
import { SearchRouteDependencies } from '../search_service';
import { shimHitsTotal } from './shim_hits_total';
import { getShardTimeout, getDefaultSearchParams, toSnakeCase } from '..';

interface MsearchHeaders {
  index: string;
  preference?: number | string;
}

interface MsearchRequest {
  header: MsearchHeaders;
  body: any;
}

interface RequestBody {
  searches: MsearchRequest[];
}

/** @internal */
export function convertRequestBody(
  requestBody: RequestBody,
  { timeout }: { timeout?: string }
): string {
  return requestBody.searches.reduce((req, curr) => {
    const header = JSON.stringify({
      ignore_unavailable: true,
      ...curr.header,
    });
    const body = JSON.stringify({
      timeout,
      ...curr.body,
    });
    return `${req}${header}\n${body}\n`;
  }, '');
}

/**
 * The msearch route takes in an array of searches, each consisting of header
 * and body json, and reformts them into a single request for the _msearch API.
 *
 * The reason for taking requests in a different format is so that we can
 * inject values into each request without needing to manually parse each one.
 *
 * This route is internal and _should not be used_ in any new areas of code.
 * It only exists as a means of removing remaining dependencies on the
 * legacy ES client.
 *
 * @deprecated
 */
export function registerMsearchRoute(router: IRouter, deps: SearchRouteDependencies): void {
  router.post(
    {
      path: '/internal/_msearch',
      validate: {
        body: schema.object({
          searches: schema.arrayOf(
            schema.object({
              header: schema.object(
                {
                  index: schema.string(),
                  preference: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
                },
                { unknowns: 'allow' }
              ),
              body: schema.object({}, { unknowns: 'allow' }),
            })
          ),
        }),
      },
    },
    async (context, request, res) => {
      const client = context.core.elasticsearch.client.asCurrentUser;

      // get shardTimeout
      const config = await deps.globalConfig$.pipe(first()).toPromise();
      const timeout = getShardTimeout(config);

      const body = convertRequestBody(request.body, timeout);

      // trackTotalHits is not supported by msearch
      const { trackTotalHits, ...defaultParams } = await getDefaultSearchParams(
        context.core.uiSettings.client
      );

      try {
        const response = await client.transport.request({
          method: 'GET',
          path: '/_msearch',
          body,
          querystring: toSnakeCase(defaultParams),
        });

        return res.ok({
          body: {
            ...response,
            body: {
              responses: response.body.responses?.map((r: SearchResponse<any>) => shimHitsTotal(r)),
            },
          },
        });
      } catch (err) {
        return res.customError({
          statusCode: err.statusCode || 500,
          body: {
            message: err.message,
            attributes: {
              error: err.body?.error || err.message,
            },
          },
        });
      }
    }
  );
}
