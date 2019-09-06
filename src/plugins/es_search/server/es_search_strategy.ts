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
import { ISearchStrategy, TSearchStrategyProvider } from 'src/plugins/search/server';
import { APICaller } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { ISearchContext } from 'src/plugins/search/server';
import { IEsSearchRequest, IEsSearchResponse } from './types';

export const esSearchStrategyProvider: TSearchStrategyProvider<
  IEsSearchRequest,
  IEsSearchResponse<unknown, unknown>
> = (
  context: ISearchContext,
  caller: APICaller
): ISearchStrategy<IEsSearchRequest, IEsSearchResponse<unknown, unknown>> => {
  return {
    search: async (request: IEsSearchRequest) => {
      if (request.debug) {
        // eslint-disable-next-line
        console.log(JSON.stringify(request, null, 2));
      }
      const esSearchResponse = (await caller('search', {
        ...request.params,
        // TODO: could do something like this here?
        // ...getCurrentSearchParams(context),
      })) as SearchResponse<any>;

      // The above query will either complete or timeout and throw an error.
      // There is no progress indication on this api.
      return {
        percentComplete: 100,
        // total: esSearchResponse._shards.total,
        // loaded:
        //   esSearchResponse._shards.failed +
        //   esSearchResponse._shards.skipped +
        //   esSearchResponse._shards.successful,
        ...esSearchResponse,
      };
    },
  };
};
