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

import { catchError, first, map } from 'rxjs/operators';
import { CoreStart, KibanaRequest } from 'src/core/server';
import { BfetchServerSetup } from 'src/plugins/bfetch/server';
import { IKibanaSearchResponse, ISearchClient, ISearchOptions } from '../../../common/search';
import { shimHitsTotal } from './shim_hits_total';

type GetScopedProider = (coreStart: CoreStart) => (request: KibanaRequest) => ISearchClient;

export function registerBsearchRoute(
  bfetch: BfetchServerSetup,
  coreStartPromise: Promise<[CoreStart, any, any]>,
  getScopedProvider: GetScopedProider
): void {
  bfetch.addBatchProcessingRoute<{ request: IKibanaSearchResponse; options?: ISearchOptions }, any>(
    '/internal/bsearch',
    (request) => {
      return {
        /**
         * @param requestOptions
         * @throws `KibanaServerError`
         */
        onBatchItem: async ({ request: requestData, options }) => {
          const coreStart = await coreStartPromise;
          const search = getScopedProvider(coreStart[0])(request);
          return search
            .search(requestData, options)
            .pipe(
              first(),
              map((response) => {
                return {
                  ...response,
                  ...{
                    rawResponse: shimHitsTotal(response.rawResponse),
                  },
                };
              }),
              catchError((err: any) => {
                // Re-throw as object, to get attributes passed to the client
                // eslint-disable-next-line no-throw-literal
                throw {
                  message: err.message,
                  statusCode: err.statusCode,
                  attributes: err.errBody?.error,
                };
              })
            )
            .toPromise();
        },
      };
    }
  );
}
